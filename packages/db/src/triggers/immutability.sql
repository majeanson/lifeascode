-- Immutability trigger: blocks UPDATE/DELETE on frozen features (NFR7)
-- This is embedded into the Drizzle migration after db:generate

CREATE OR REPLACE FUNCTION prevent_frozen_feature_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.frozen = true THEN
    RAISE EXCEPTION 'Cannot modify a frozen feature (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_feature_immutability
  BEFORE UPDATE OR DELETE ON features
  FOR EACH ROW
  EXECUTE FUNCTION prevent_frozen_feature_mutation();
