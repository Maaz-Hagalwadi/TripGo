ALTER TABLE users
ADD COLUMN operator_id UUID;

ALTER TABLE users
ADD CONSTRAINT fk_user_operator
    FOREIGN KEY (operator_id)
    REFERENCES operators(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
