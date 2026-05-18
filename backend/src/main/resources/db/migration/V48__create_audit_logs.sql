CREATE TABLE audit_logs (
    id          BIGSERIAL    PRIMARY KEY,
    actor_email VARCHAR(255),
    actor_role  VARCHAR(50),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id   VARCHAR(255),
    details     TEXT,
    ip_address  VARCHAR(100),
    status      VARCHAR(20)  NOT NULL DEFAULT 'SUCCESS',
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created_at  ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor_email ON audit_logs(actor_email);
CREATE INDEX idx_audit_logs_action      ON audit_logs(action);
