-- Rename customer add-page permission path to new client add-page path.
UPDATE user_accesses
SET allowed_pages_json = REPLACE(
  COALESCE(allowed_pages_json, '[]'),
  '"/customers/add-customer.html"',
  '"/customers/Add-Client.html"'
)
WHERE COALESCE(allowed_pages_json, '') LIKE '%/customers/add-customer.html%';

UPDATE user_accesses
SET allowed_actions_json = REPLACE(
  REPLACE(
    COALESCE(allowed_actions_json, '[]'),
    '"/customers/add-customer.html::view"',
    '"/customers/Add-Client.html::view"'
  ),
  '"/customers/add-customer.html::add"',
  '"/customers/Add-Client.html::add"'
)
WHERE COALESCE(allowed_actions_json, '') LIKE '%/customers/add-customer.html::%';
