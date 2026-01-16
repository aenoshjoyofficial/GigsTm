-- Module 1: User & Worker Management

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: We use Supabase Auth for the 'users' table (auth.users)
-- This schema focuses on the public profiles and related data.

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  avatar_url VARCHAR(255),
  contact_number VARCHAR(50),
  address TEXT,
  date_of_birth DATE,
  country VARCHAR(100),
  timezone VARCHAR(100),
  bio TEXT,
  headline VARCHAR(255),
  role VARCHAR(50) DEFAULT 'worker' CHECK (role IN ('worker', 'admin', 'manager', 'client')),
  signup_source VARCHAR(50) CHECK (signup_source IN ('worker', 'admin')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL CHECK (document_type IN ('ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'AADHAR', 'PAN', 'OTHER')),
  document_url VARCHAR(255) NOT NULL,
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles_permissions (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) UNIQUE NOT NULL,
  permissions JSONB
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module 2: Gig Listing & Discovery

CREATE TABLE gig_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES gig_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  pay_amount DECIMAL(12, 2) NOT NULL CHECK (pay_amount >= 0),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'draft')), -- active, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gig_steps (
  id SERIAL PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL CHECK (step_order >= 0),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  required_proof_type VARCHAR(50), -- image, text, file
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gig_qualifications (
  id SERIAL PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  qualification_type VARCHAR(100) NOT NULL, -- skill, experience, kyc_status, location
  value TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gig_tags (
  id SERIAL PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gig_id, tag_name)
);

CREATE TABLE gig_media (
  id SERIAL PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  media_url VARCHAR(255) NOT NULL,
  media_type VARCHAR(50), -- image, video
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gig_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, gig_id)
);

-- Module 3: Application & Assignment

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'testing', 'training')), -- pending, accepted, rejected, testing, training
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, gig_id)
);

CREATE TABLE mcq_questions (
  id SERIAL PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of options
  correct_option_index INTEGER NOT NULL CHECK (correct_option_index >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mcq_results (
  id SERIAL PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  passed BOOLEAN NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trainings (
  id SERIAL PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_modules (
  id SERIAL PRIMARY KEY,
  training_id INTEGER REFERENCES trainings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content_url VARCHAR(255),
  content_type VARCHAR(50) CHECK (content_type IN ('video', 'pdf', 'text', 'link')), -- video, pdf, text
  module_order INTEGER NOT NULL CHECK (module_order >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')), -- active, completed, cancelled
  due_date TIMESTAMPTZ
);

CREATE TABLE application_feedback (
  id SERIAL PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  feedback_text TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module 4: Task Submission & Verification

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_step_id INTEGER REFERENCES gig_steps(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disputed')), -- pending, approved, rejected, disputed
  submission_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_media (
  id SERIAL PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  media_url VARCHAR(255) NOT NULL,
  media_type VARCHAR(50) CHECK (media_type IN ('image', 'video', 'file')), -- image, file
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_verifications (
  id SERIAL PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  verifier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('approved', 'rejected')), -- approved, rejected
  remarks TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_history (
  id SERIAL PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'disputed')),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')), -- open, resolved, closed
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module 5: Payment & Rewards

CREATE TABLE wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) DEFAULT 0.00 CHECK (balance >= 0),
  currency VARCHAR(10) DEFAULT 'USD',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payout_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_txns INTEGER DEFAULT 0 CHECK (total_txns >= 0),
  total_amount DECIMAL(12, 2) DEFAULT 0.00 CHECK (total_amount >= 0),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')), -- pending, processing, completed, failed
  gateway_response JSONB,
  processed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(user_id) ON DELETE CASCADE,
  batch_id UUID REFERENCES payout_batches(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  amount_net DECIMAL(12, 2) CHECK (amount_net >= 0), -- Amount after tax deductions
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'withdrawal', 'bonus', 'refund')), -- credit, debit, withdrawal, bonus, refund
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')), -- pending, completed, failed, reversed
  reference_id UUID, -- Can be claim_id or withdrawal_request_id
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tax_deductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  tax_type VARCHAR(50) NOT NULL CHECK (tax_type IN ('TDS', 'GST', 'SERVICE_TAX')), -- TDS, GST, SERVICE_TAX
  percentage DECIMAL(5, 2) NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  deducted_amount DECIMAL(12, 2) NOT NULL CHECK (deducted_amount >= 0),
  filed_status VARCHAR(50) DEFAULT 'pending' CHECK (filed_status IN ('pending', 'filed')), -- pending, filed
  filed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE withdraw_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')), -- pending, approved, rejected, processed
  payout_method JSONB, -- Bank details, UPI, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE finance_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Auditor
  action_type VARCHAR(100) NOT NULL CHECK (action_type IN ('verification', 'approval', 'rejection', 'correction')), -- verification, approval, rejection, correction
  target_table VARCHAR(100), -- transactions, withdraw_requests, claims
  target_id UUID,
  previous_data JSONB,
  new_data JSONB,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  gateway_txn_id VARCHAR(255),
  internal_status VARCHAR(50),
  gateway_status VARCHAR(50),
  mismatch_found BOOLEAN DEFAULT FALSE,
  details JSONB,
  reconciled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bonus_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('referral', 'performance', 'sign_up')), -- referral, performance, sign_up
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'credited')), -- pending, credited
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_url VARCHAR(255),
  total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
  tax_amount DECIMAL(12, 2) DEFAULT 0.00 CHECK (tax_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_experiences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  start_date DATE,
  end_date DATE,
  description TEXT
);

-- Module 8: Communication, Support & Engagement

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')), -- info, success, warning, error
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title VARCHAR,
  p_message TEXT,
  p_type VARCHAR DEFAULT 'info',
  p_link VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE help_center_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')), -- open, in_progress, resolved, closed
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')), -- low, medium, high
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id UUID REFERENCES help_center_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for new ticket message notifications
CREATE OR REPLACE FUNCTION notify_on_ticket_message() RETURNS TRIGGER AS $$
DECLARE
  v_ticket_user_id UUID;
  v_ticket_subject TEXT;
BEGIN
  -- Get the ticket owner and subject
  SELECT user_id, subject INTO v_ticket_user_id, v_ticket_subject 
  FROM help_center_tickets 
  WHERE id = NEW.ticket_id;

  -- If the sender is NOT the ticket owner, notify the owner (Support replied)
  IF NEW.sender_id != v_ticket_user_id THEN
    PERFORM create_notification(
      v_ticket_user_id,
      'New Support Reply',
      'You have a new reply for your ticket: ' || v_ticket_subject,
      'info',
      '/support/tickets/' || NEW.ticket_id
    );
  -- If the sender IS the ticket owner, notify admins (User replied)
  ELSE
    -- Find an admin to notify (simplified: notify all admins or a specific role)
    -- For now, let's just insert for the ticket owner as a confirmation, 
    -- and potentially a system-wide admin notification table if one existed.
    -- In a real app, you might notify the 'assigned' agent.
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_ticket_message_notification
AFTER INSERT ON ticket_messages
FOR EACH ROW EXECUTE FUNCTION notify_on_ticket_message();

-- Trigger for ticket status changes
CREATE OR REPLACE FUNCTION notify_on_ticket_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    PERFORM create_notification(
      NEW.user_id,
      'Ticket Status Updated',
      'Your ticket "' || NEW.subject || '" is now ' || NEW.status,
      'info',
      '/support/tickets/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_ticket_status_notification
AFTER UPDATE OF status ON help_center_tickets
FOR EACH ROW EXECUTE FUNCTION notify_on_ticket_status_change();

-- Module 8: In-App Messaging
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster message retrieval
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_receiver_sender ON messages(receiver_id, sender_id);

-- Module 8: Announcements & FAQs
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_role VARCHAR(50) DEFAULT 'all' CHECK (target_role IN ('all', 'worker', 'manager', 'admin')), -- all, worker, manager, admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE faq_articles (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module 2: Gig Reviews
CREATE TABLE gig_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gig_id, user_id)
);

CREATE INDEX idx_gig_reviews_gig_id ON gig_reviews(gig_id);

-- Additional Performance Indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX idx_withdraw_requests_status ON withdraw_requests(status);
CREATE INDEX idx_gigs_status ON gigs(status);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_payout_batches_status ON payout_batches(status);
CREATE INDEX idx_tax_deductions_transaction_id ON tax_deductions(transaction_id);
CREATE INDEX idx_bonus_rewards_user_id ON bonus_rewards(user_id);
CREATE INDEX idx_gig_tags_tag_name ON gig_tags(tag_name);
CREATE INDEX idx_gig_steps_gig_id ON gig_steps(gig_id);
CREATE INDEX idx_gig_qualifications_gig_id ON gig_qualifications(gig_id);
CREATE INDEX idx_mcq_questions_gig_id ON mcq_questions(gig_id);
CREATE INDEX idx_mcq_results_application_id ON mcq_results(application_id);
CREATE INDEX idx_trainings_gig_id ON trainings(gig_id);
CREATE INDEX idx_training_modules_training_id ON training_modules(training_id);
CREATE INDEX idx_work_orders_application_id ON work_orders(application_id);
CREATE INDEX idx_application_feedback_application_id ON application_feedback(application_id);
CREATE INDEX idx_claim_media_claim_id ON claim_media(claim_id);
CREATE INDEX idx_claim_verifications_claim_id ON claim_verifications(claim_id);
CREATE INDEX idx_claim_history_claim_id ON claim_history(claim_id);
CREATE INDEX idx_disputes_claim_id ON disputes(claim_id);
CREATE INDEX idx_invoice_records_user_id ON invoice_records(user_id);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee_id ON referrals(referee_id);
CREATE INDEX idx_user_experiences_user_id ON user_experiences(user_id);

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Helper Functions
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_manager() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'manager');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'));
$$ LANGUAGE sql SECURITY DEFINER;

-- Auth Trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, role, signup_source)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
    COALESCE(NEW.raw_user_meta_data->>'signup_source', 'worker')
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1. user_profiles
CREATE POLICY "Users can create their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Profiles are viewable by owner and staff" ON user_profiles FOR SELECT USING (auth.uid() = user_id OR is_staff());
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON user_profiles FOR ALL USING (is_admin());

-- 2. kyc_documents
CREATE POLICY "Users can view their own KYC" ON kyc_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload their own KYC" ON kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all KYC" ON kyc_documents FOR ALL USING (is_admin());
CREATE POLICY "Staff can view all KYC" ON kyc_documents FOR SELECT USING (is_staff());

-- 3. wallets
CREATE POLICY "Users can create their own wallet" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all wallets" ON wallets FOR SELECT USING (is_staff());
CREATE POLICY "Admins can manage all wallets" ON wallets FOR ALL USING (is_admin());

-- 4. transactions
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (EXISTS (SELECT 1 FROM wallets WHERE user_id = auth.uid() AND user_id = transactions.wallet_id));
CREATE POLICY "Staff can view all transactions" ON transactions FOR SELECT USING (is_staff());
CREATE POLICY "Admins can manage all transactions" ON transactions FOR ALL USING (is_admin());

-- 5. gigs
CREATE POLICY "Gigs are viewable by everyone" ON gigs FOR SELECT USING (true);
CREATE POLICY "Staff can manage gigs" ON gigs FOR ALL USING (is_staff());

-- 6. applications
CREATE POLICY "Users can view their own applications" ON applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create applications" ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all applications" ON applications FOR ALL USING (is_staff());

-- 7. work_orders
CREATE POLICY "Users can view their own work orders" ON work_orders FOR SELECT USING (EXISTS (SELECT 1 FROM applications WHERE id = work_orders.application_id AND user_id = auth.uid()));
CREATE POLICY "Staff can manage all work orders" ON work_orders FOR ALL USING (is_staff());

-- 8. claims
CREATE POLICY "Workers can view/create their own claims" ON claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Workers can submit claims" ON claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all claims" ON claims FOR ALL USING (is_staff());

-- 9. notifications
CREATE POLICY "Users can manage their own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- 10. help_center_tickets
CREATE POLICY "Users can manage their own tickets" ON help_center_tickets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all tickets" ON help_center_tickets FOR ALL USING (is_staff());

-- 11. ticket_messages
CREATE POLICY "Users can view/create messages for their tickets" ON ticket_messages FOR ALL USING (EXISTS (SELECT 1 FROM help_center_tickets WHERE id = ticket_messages.ticket_id AND user_id = auth.uid()));
CREATE POLICY "Staff can manage all ticket messages" ON ticket_messages FOR ALL USING (is_staff());

-- 12. messages
CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 13. announcements
CREATE POLICY "Announcements are viewable by everyone" ON announcements FOR SELECT USING (true);
CREATE POLICY "Staff can manage announcements" ON announcements FOR ALL USING (is_staff());

-- 14. payout_batches
CREATE POLICY "Staff can manage payout batches" ON payout_batches FOR ALL USING (is_staff());

-- 15. tax_deductions
CREATE POLICY "Users can view their own tax deductions" ON tax_deductions FOR SELECT USING (EXISTS (SELECT 1 FROM transactions t JOIN wallets w ON t.wallet_id = w.user_id WHERE t.id = tax_deductions.transaction_id AND w.user_id = auth.uid()));
CREATE POLICY "Staff can manage all tax deductions" ON tax_deductions FOR ALL USING (is_staff());

-- 16. withdraw_requests
CREATE POLICY "Users can view their own withdraw requests" ON withdraw_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdraw requests" ON withdraw_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all withdraw requests" ON withdraw_requests FOR ALL USING (is_staff());

-- 17. bonus_rewards
CREATE POLICY "Users can view their own rewards" ON bonus_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all rewards" ON bonus_rewards FOR ALL USING (is_staff());

-- 18. invoice_records
CREATE POLICY "Users can view their own invoices" ON invoice_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all invoices" ON invoice_records FOR ALL USING (is_staff());

-- 19. gig_reviews
CREATE POLICY "Reviews are viewable by everyone" ON gig_reviews FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reviews" ON gig_reviews FOR ALL USING (auth.uid() = user_id);

-- 20. gig_steps, qualifications, tags, media, categories
CREATE POLICY "Gig metadata is viewable by everyone" ON gig_steps FOR SELECT USING (true);
CREATE POLICY "Gig metadata is viewable by everyone" ON gig_qualifications FOR SELECT USING (true);
CREATE POLICY "Gig metadata is viewable by everyone" ON gig_tags FOR SELECT USING (true);
CREATE POLICY "Gig metadata is viewable by everyone" ON gig_media FOR SELECT USING (true);
CREATE POLICY "Gig metadata is viewable by everyone" ON gig_categories FOR SELECT USING (true);
CREATE POLICY "Staff can manage gig metadata" ON gig_steps FOR ALL USING (is_staff());
CREATE POLICY "Staff can manage gig metadata" ON gig_qualifications FOR ALL USING (is_staff());
CREATE POLICY "Staff can manage gig metadata" ON gig_tags FOR ALL USING (is_staff());
CREATE POLICY "Staff can manage gig metadata" ON gig_media FOR ALL USING (is_staff());
CREATE POLICY "Staff can manage gig metadata" ON gig_categories FOR ALL USING (is_staff());

-- 21. gig_bookmarks
CREATE POLICY "Users can manage their own bookmarks" ON gig_bookmarks FOR ALL USING (auth.uid() = user_id);

-- 22. mcq_questions, mcq_results
CREATE POLICY "Questions are viewable by everyone" ON mcq_questions FOR SELECT USING (true);
CREATE POLICY "Admins manage questions" ON mcq_questions FOR ALL USING (is_admin());
CREATE POLICY "Users view their own results" ON mcq_results FOR SELECT USING (EXISTS (SELECT 1 FROM applications WHERE id = mcq_results.application_id AND user_id = auth.uid()));
CREATE POLICY "Staff manage results" ON mcq_results FOR ALL USING (is_staff());

-- 23. trainings, training_modules
CREATE POLICY "Trainings are viewable by everyone" ON trainings FOR SELECT USING (true);
CREATE POLICY "Trainings are viewable by everyone" ON training_modules FOR SELECT USING (true);
CREATE POLICY "Staff manage trainings" ON trainings FOR ALL USING (is_staff());
CREATE POLICY "Staff manage trainings" ON training_modules FOR ALL USING (is_staff());

-- 24. claim_media, claim_verifications, claim_history, disputes
CREATE POLICY "Users manage their own claim media" ON claim_media FOR ALL USING (EXISTS (SELECT 1 FROM claims WHERE id = claim_media.claim_id AND user_id = auth.uid()));
CREATE POLICY "Staff manage claim media" ON claim_media FOR ALL USING (is_staff());
CREATE POLICY "Staff manage claim verifications" ON claim_verifications FOR ALL USING (is_staff());
CREATE POLICY "Users view their own claim history" ON claim_history FOR SELECT USING (EXISTS (SELECT 1 FROM claims WHERE id = claim_history.claim_id AND user_id = auth.uid()));
CREATE POLICY "Staff manage claim history" ON claim_history FOR ALL USING (is_staff());
CREATE POLICY "Users manage their own disputes" ON disputes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Staff manage disputes" ON disputes FOR ALL USING (is_staff());

-- 25. user_activity_logs, referrals, user_experiences
CREATE POLICY "Users view their own logs" ON user_activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all logs" ON user_activity_logs FOR ALL USING (is_admin());
CREATE POLICY "Users manage their own referrals" ON referrals FOR ALL USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
CREATE POLICY "Staff manage referrals" ON referrals FOR ALL USING (is_staff());
CREATE POLICY "Public experiences" ON user_experiences FOR SELECT USING (true);
CREATE POLICY "Users manage their own experiences" ON user_experiences FOR ALL USING (auth.uid() = user_id);

-- 26. finance_audit_logs, reconciliations
CREATE POLICY "Admins manage finance audit" ON finance_audit_logs FOR ALL USING (is_admin());
CREATE POLICY "Admins manage reconciliations" ON reconciliations FOR ALL USING (is_admin());

-- 27. faq_articles
CREATE POLICY "FAQs are viewable by everyone" ON faq_articles FOR SELECT USING (true);
CREATE POLICY "Staff manage FAQs" ON faq_articles FOR ALL USING (is_staff());
