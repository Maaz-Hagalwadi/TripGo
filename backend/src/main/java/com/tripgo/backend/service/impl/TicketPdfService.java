package com.tripgo.backend.service.impl;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.BookingSeat;
import com.tripgo.backend.model.entities.Ticket;
import com.tripgo.backend.repository.BookingSeatRepository;
import com.tripgo.backend.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketPdfService {

    private final TicketRepository ticketRepository;
    private final BookingSeatRepository bookingSeatRepository;

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").withZone(ZoneId.of("Asia/Kolkata"));

    public byte[] generateTicketPdf(Booking booking) {
        Ticket ticket = ticketRepository.findByBooking(booking)
                .orElseThrow(() -> new RuntimeException("Ticket not found for booking"));

        List<BookingSeat> seats = bookingSeatRepository.findByBookingId(booking.getId());

        try {
            // 1. Generate QR code content
            String qrContent = String.join("|",
                    booking.getBookingCode(),
                    ticket.getTicketNo(),
                    booking.getRouteSchedule().getRoute().getOrigin(),
                    booking.getRouteSchedule().getRoute().getDestination(),
                    FORMATTER.format(booking.getRouteSchedule().getDepartureTime())
            );

            byte[] qrBytes = generateQrCode(qrContent, 200);

            // Save QR to ticket entity
            ticket.setQrCode(qrBytes);
            ticketRepository.save(ticket);

            // 2. Build PDF
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);

            DeviceRgb primaryColor = new DeviceRgb(37, 99, 235); // blue

            // Header
            Paragraph header = new Paragraph("TripGo — Bus Ticket")
                    .setFontSize(20)
                    .setBold()
                    .setFontColor(primaryColor)
                    .setTextAlignment(TextAlignment.CENTER);
            doc.add(header);

            doc.add(new Paragraph("Booking Code: " + booking.getBookingCode())
                    .setFontSize(13)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(10));

            // Trip info table
            Table tripTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginBottom(10);

            addRow(tripTable, "From", seats.isEmpty() ? booking.getRouteSchedule().getRoute().getOrigin() : seats.get(0).getFromStop());
            addRow(tripTable, "To", seats.isEmpty() ? booking.getRouteSchedule().getRoute().getDestination() : seats.get(0).getToStop());
            addRow(tripTable, "Departure", FORMATTER.format(booking.getRouteSchedule().getDepartureTime()));
            addRow(tripTable, "Arrival", FORMATTER.format(booking.getRouteSchedule().getArrivalTime()));
            addRow(tripTable, "Bus", booking.getRouteSchedule().getBus().getName());
            addRow(tripTable, "Travel Date", booking.getTravelDate() != null ? booking.getTravelDate().toString() : "-");
            addRow(tripTable, "Ticket No", ticket.getTicketNo());
            doc.add(tripTable);

            // Passengers table
            doc.add(new Paragraph("Passengers").setFontSize(13).setBold().setMarginTop(10));
            Table passengerTable = new Table(UnitValue.createPercentArray(new float[]{1, 2, 1, 1, 1}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginBottom(10);

            // Header row
            for (String col : new String[]{"Seat", "Name", "Age", "Gender", "Fare"}) {
                passengerTable.addHeaderCell(new Cell()
                        .add(new Paragraph(col).setBold())
                        .setBackgroundColor(primaryColor)
                        .setFontColor(ColorConstants.WHITE));
            }

            for (BookingSeat bs : seats) {
                passengerTable.addCell(bs.getSeatNumber());
                String name = bs.getPassenger() != null
                        ? bs.getPassenger().getFirstName() + " " + (bs.getPassenger().getLastName() != null ? bs.getPassenger().getLastName() : "")
                        : "-";
                passengerTable.addCell(name.trim());
                passengerTable.addCell(bs.getPassenger() != null && bs.getPassenger().getAge() != null ? String.valueOf(bs.getPassenger().getAge()) : "-");
                passengerTable.addCell(bs.getPassenger() != null ? bs.getPassenger().getGender() : "-");
                passengerTable.addCell(bs.getFare() != null ? "₹" + bs.getFare() : "-");
            }
            doc.add(passengerTable);

            // Amount summary
            doc.add(new Paragraph("Payment Summary").setFontSize(13).setBold().setMarginTop(10));
            Table amountTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                    .setWidth(UnitValue.createPercentValue(60))
                    .setMarginBottom(10);
            addRow(amountTable, "Base Fare", "₹" + booking.getTotalAmount());
            addRow(amountTable, "GST", "₹" + booking.getGstAmount());
            addRow(amountTable, "Total Paid", "₹" + booking.getPayableAmount());
            doc.add(amountTable);

            // QR code
            Image qrImage = new Image(ImageDataFactory.create(qrBytes))
                    .setWidth(120)
                    .setHeight(120)
                    .setHorizontalAlignment(HorizontalAlignment.CENTER)
                    .setMarginTop(10);
            doc.add(qrImage);

            doc.add(new Paragraph("Scan QR code at boarding for verification")
                    .setFontSize(9)
                    .setFontColor(ColorConstants.GRAY)
                    .setTextAlignment(TextAlignment.CENTER));

            doc.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate ticket PDF: " + e.getMessage(), e);
        }
    }

    private byte[] generateQrCode(String content, int size) throws Exception {
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", out);
        return out.toByteArray();
    }

    private void addRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label).setBold()));
        table.addCell(new Cell().add(new Paragraph(value != null ? value : "-")));
    }
}
