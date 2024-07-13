CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_confirmed BOOLEAN DEFAULT FALSE,
    confirm_token VARCHAR(36)
);


   
