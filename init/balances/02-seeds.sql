-- Seed initial balances matching wallet core accounts
-- Alice's account (f8df753c...) starts with 1000.00
-- Bob's account  (0216ea38...) starts with  500.00
INSERT IGNORE INTO balances (account_id, balance, updated_at) VALUES
  ('f8df753c-3b58-43aa-8016-12aaa4f1ea3e', 1000.00, NOW()),
  ('0216ea38-524f-4e85-8743-d484a8f7538e',  500.00, NOW());
