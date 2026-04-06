package com.tripgo.backend.model.entities;

import com.tripgo.backend.util.JsonListConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "schedule_policies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SchedulePolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false, unique = true)
    private RouteSchedule schedule;

    @Convert(converter = JsonListConverter.class)
    @Column(name = "cancellation_slabs", columnDefinition = "jsonb")
    private List<Map<String, Object>> cancellationSlabs;

    @Column(name = "date_change_allowed")
    private Boolean dateChangeAllowed = true;

    @Column(name = "date_change_fee_percent")
    private Integer dateChangeFeePercent = 10;

    @Column(name = "date_change_min_hours")
    private Integer dateChangeMinHours = 12;

    @Column(name = "luggage_policy")
    private String luggagePolicy = "1 bag up to 15kg allowed";

    @Column(name = "children_policy")
    private String childrenPolicy = "Children below 5 travel free";

    @Column(name = "pets_allowed")
    private Boolean petsAllowed = false;

    @Column(name = "liquor_allowed")
    private Boolean liquorAllowed = false;

    @Column(name = "smoking_allowed")
    private Boolean smokingAllowed = false;

    @Column(name = "pickup_notes")
    private String pickupNotes;

    @Convert(converter = JsonListConverter.class)
    @Column(name = "rest_stops", columnDefinition = "jsonb")
    private List<Map<String, Object>> restStops;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
