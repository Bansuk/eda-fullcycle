CREATE TABLE IF NOT EXISTS clients (
  id          VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts (
  id          VARCHAR(255)   NOT NULL,
  client_id   VARCHAR(255)   NOT NULL,
  balance     DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at  DATETIME       NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id              VARCHAR(255)   NOT NULL,
  account_id_from VARCHAR(255)   NOT NULL,
  account_id_to   VARCHAR(255)   NOT NULL,
  amount          DECIMAL(10, 2) NOT NULL,
  created_at      DATETIME       NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO clients (id, name, email, created_at) VALUES
  ('f4a498a7-5f0c-4ead-8f3b-d5a48264a2b1', 'Alice Smith', 'alice@example.com', NOW()),
  ('8b38afc4-1e47-4f9d-a2f5-ef12dc0c3c34', 'Bob Jones',   'bob@example.com',   NOW());

INSERT IGNORE INTO accounts (id, client_id, balance, created_at) VALUES
  ('f8df753c-3b58-43aa-8016-12aaa4f1ea3e', 'f4a498a7-5f0c-4ead-8f3b-d5a48264a2b1', 1000.00, NOW()),
  ('0216ea38-524f-4e85-8743-d484a8f7538e', '8b38afc4-1e47-4f9d-a2f5-ef12dc0c3c34',  500.00, NOW());
