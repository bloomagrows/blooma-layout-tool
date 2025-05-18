/*
  # Initial Schema for Blooma

  1. New Tables
    - plants
      - Core plant information and growing requirements
    - garden_layouts
      - User-generated garden designs
    - users
      - User profiles and preferences
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create plants table
CREATE TABLE plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scientific_name text NOT NULL,
  description text NOT NULL,
  companion_plants uuid[] DEFAULT '{}',
  growing_zones integer[] NOT NULL,
  spacing integer NOT NULL, -- in inches
  height integer NOT NULL, -- in inches
  sun_requirement text NOT NULL CHECK (sun_requirement IN ('full', 'partial', 'shade')),
  watering_needs text NOT NULL CHECK (watering_needs IN ('low', 'moderate', 'high')),
  seasonality text[] NOT NULL,
  days_to_maturity integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create garden_layouts table
CREATE TABLE garden_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  plants jsonb NOT NULL, -- Array of {plantId: uuid, x: number, y: number}
  width integer NOT NULL,
  height integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text NOT NULL,
  growing_zone integer NOT NULL,
  saved_gardens uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Plants policies (readable by all, only admin can modify)
CREATE POLICY "Plants are viewable by everyone"
  ON plants FOR SELECT
  TO public
  USING (true);

-- Garden layouts policies
CREATE POLICY "Users can create garden layouts"
  ON garden_layouts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own garden layouts"
  ON garden_layouts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User profiles policies
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());