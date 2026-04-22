# 🚍 TripGo – Online Bus Booking Platform

TripGo is a **production-grade online bus booking system** built using **Java Spring Boot**, designed to showcase real-world backend engineering skills such as authentication, payments, transactional seat booking, and scalable architecture.

This project is structured to reflect **industry-level quality**, making it ideal for portfolios, interviews, and hands-on learning.

----

## 🧑‍💻 Tech Stack

### **Backend**
- Java 21
- Spring Boot (Web, MVC, Security, JPA)
- Hibernate
- PostgreSQL
- JWT Authentication
- Bucket4j (Rate Limiting)
- Kafka (Event-driven design)
- Lombok

### **Frontend**
- HTML, CSS, JavaScript (existing UI to be integrated)

### **Tools / DevOps**
- Docker & Docker Compose
- Git & GitHub
- Maven
- Postman 
- CI/CD (Jenkins – upcoming)

### **Integrations**
- Stripe Payments (test mode)
- Spring Mail for Email Notifications
- PDF Ticket Generation

---

## 🎯 Project Goals

- Build a **production-ready** backend with clean architecture.
- Practice **JWT authentication**, **role-based access**, and **REST API design**.
- Apply **transactional safety** for seat booking to prevent double booking.
- Implement **real payments** (Stripe/Razorpay) + **mock payment** for testing/demo.
- Auto-generate **PDF tickets** and deliver via **email**.
- Add **rate limiting**, **Kafka pipelines**, and **Docker deployment**.
- Build a project that **impresses recruiters** and demonstrates real engineering skills.

---

## ✨ Features

- 🔐 JWT Authentication (Admin/User)
- 🚌 Bus Management (Admin)
- 🔍 Bus Search with Pagination
- 🎟 Seat Booking & Seat Locking
- 💳 Payment Integration (Stripe)
- 📄 PDF Ticket Generation
- 📧 Email Ticket Delivery
- 🚦 Rate Limiting with Bucket4j
- 📡 Kafka Event Design
- 📦 Dockerized Backend with Postgres

---

## 🏗 High-Level Architecture
*(Architecture diagram will be added soon)*

---


---

## 🚀 Build Roadmap (7 Days)

- **Day 0:** Repo setup, README, base structure
- **Day 1:** Entities + DB + CRUD
- **Day 2:** JWT Authentication + Roles
- **Day 3:** Booking + Pagination + Seat Locking
- **Day 4:** Payments (Stripe/Razorpay + mock)
- **Day 5:** Email + PDF + Rate Limiting + Docker
- **Day 6:** Tests + CI/CD + Metrics
- **Day 7:** UI integration + Deployment + Polishing

---

## ▶️ How to Run (will update after backend setup)

```bash
git clone https://github.com/YOUR_USERNAME/TripGo.git
cd TripGo/backend
mvn clean install
mvn spring-boot:run


## 📁 Project Structure

