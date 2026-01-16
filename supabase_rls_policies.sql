-- SUPABASE RLS POLICIES FOR GIGSTM
-- This file contains the updated and comprehensive RLS policies for the Supabase database.

-- 1. ENABLE RLS ON ALL TABLES
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 2. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_manager() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'manager');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'));
$$ LANGUAGE sql SECURITY DEFINER;

-- 2.5 AUTH TRIGGER FOR PROFILE CREATION
-- This ensures profiles and wallets are created automatically even if RLS blocks direct client-side insertion
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

-- To enable this trigger, run:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. USER PROFILES & KYC
CREATE POLICY "Users can create their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Profiles are viewable by owner and staff" ON user_profiles FOR SELECT USING (auth.uid() = user_id OR is_staff());
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON user_profiles FOR ALL USING (is_admin());

CREATE POLICY "Users can view their own KYC" ON kyc_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload their own KYC" ON kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all KYC" ON kyc_documents FOR ALL USING (is_admin());
CREATE POLICY "Staff can view all KYC" ON kyc_documents FOR SELECT USING (is_staff());

-- 4. FINANCIAL TABLES (WALLETS, TRANSACTIONS, PAYOUTS)
CREATE POLICY "Users can create their own wallet" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all wallets" ON wallets FOR SELECT USING (is_staff());
CREATE POLICY "Admins can manage all wallets" ON wallets FOR ALL USING (is_admin());

CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (EXISTS (SELECT 1 FROM wallets WHERE user_id = auth.uid() AND user_id = transactions.wallet_id));
CREATE POLICY "Staff can view all transactions" ON transactions FOR SELECT USING (is_staff());
CREATE POLICY "Admins can manage all transactions" ON transactions FOR ALL USING (is_admin());

CREATE POLICY "Staff can manage payout batches" ON payout_batches FOR ALL USING (is_staff());

CREATE POLICY "Users can view their own tax deductions" ON tax_deductions FOR SELECT USING (EXISTS (SELECT 1 FROM transactions t JOIN wallets w ON t.wallet_id = w.user_id WHERE t.id = tax_deductions.transaction_id AND w.user_id = auth.uid()));
CREATE POLICY "Staff can manage all tax deductions" ON tax_deductions FOR ALL USING (is_staff());

CREATE POLICY "Users can view their own withdraw requests" ON withdraw_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdraw requests" ON withdraw_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all withdraw requests" ON withdraw_requests FOR ALL USING (is_staff());

-- 5. GIGS & DISCOVERY
CREATE POLICY "Gigs are viewable by everyone" ON gigs FOR SELECT USING (true);
CREATE POLICY "Staff can manage gigs" ON gigs FOR ALL USING (is_staff());

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

CREATE POLICY "Users can manage their own bookmarks" ON gig_bookmarks FOR ALL USING (auth.uid() = user_id);

-- 6. APPLICATIONS & WORK ORDERS
CREATE POLICY "Users can view their own applications" ON applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create applications" ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all applications" ON applications FOR ALL USING (is_staff());

CREATE POLICY "Users can view their own work orders" ON work_orders FOR SELECT USING (EXISTS (SELECT 1 FROM applications WHERE id = work_orders.application_id AND user_id = auth.uid()));
CREATE POLICY "Staff can manage all work orders" ON work_orders FOR ALL USING (is_staff());

-- 7. TASKS, CLAIMS & DISPUTES
CREATE POLICY "Workers can view/create their own claims" ON claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Workers can submit claims" ON claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all claims" ON claims FOR ALL USING (is_staff());

CREATE POLICY "Users manage their own claim media" ON claim_media FOR ALL USING (EXISTS (SELECT 1 FROM claims WHERE id = claim_media.claim_id AND user_id = auth.uid()));
CREATE POLICY "Staff manage claim media" ON claim_media FOR ALL USING (is_staff());

CREATE POLICY "Staff manage claim verifications" ON claim_verifications FOR ALL USING (is_staff());

CREATE POLICY "Users view their own claim history" ON claim_history FOR SELECT USING (EXISTS (SELECT 1 FROM claims WHERE id = claim_history.claim_id AND user_id = auth.uid()));
CREATE POLICY "Staff manage claim history" ON claim_history FOR ALL USING (is_staff());

CREATE POLICY "Users manage their own disputes" ON disputes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Staff manage disputes" ON disputes FOR ALL USING (is_staff());

-- 8. MCQ & TRAINING
CREATE POLICY "Questions are viewable by everyone" ON mcq_questions FOR SELECT USING (true);
CREATE POLICY "Admins manage questions" ON mcq_questions FOR ALL USING (is_admin());

CREATE POLICY "Users view their own results" ON mcq_results FOR SELECT USING (EXISTS (SELECT 1 FROM applications WHERE id = mcq_results.application_id AND user_id = auth.uid()));
CREATE POLICY "Staff manage results" ON mcq_results FOR ALL USING (is_staff());

CREATE POLICY "Trainings are viewable by everyone" ON trainings FOR SELECT USING (true);
CREATE POLICY "Trainings are viewable by everyone" ON training_modules FOR SELECT USING (true);
CREATE POLICY "Staff manage trainings" ON trainings FOR ALL USING (is_staff());
CREATE POLICY "Staff manage trainings" ON training_modules FOR ALL USING (is_staff());

-- 9. COMMUNICATION & SUPPORT
CREATE POLICY "Users can manage their own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tickets" ON help_center_tickets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all tickets" ON help_center_tickets FOR ALL USING (is_staff());

CREATE POLICY "Users can view/create messages for their tickets" ON ticket_messages FOR ALL USING (EXISTS (SELECT 1 FROM help_center_tickets WHERE id = ticket_messages.ticket_id AND user_id = auth.uid()));
CREATE POLICY "Staff can manage all ticket messages" ON ticket_messages FOR ALL USING (is_staff());

CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Announcements are viewable by everyone" ON announcements FOR SELECT USING (true);
CREATE POLICY "Staff can manage announcements" ON announcements FOR ALL USING (is_staff());

CREATE POLICY "FAQs are viewable by everyone" ON faq_articles FOR SELECT USING (true);
CREATE POLICY "Staff manage FAQs" ON faq_articles FOR ALL USING (is_staff());

-- 10. REVIEWS & REFERRALS
CREATE POLICY "Reviews are viewable by everyone" ON gig_reviews FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reviews" ON gig_reviews FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own referrals" ON referrals FOR ALL USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
CREATE POLICY "Staff manage referrals" ON referrals FOR ALL USING (is_staff());

-- 11. AUDIT & LOGS
CREATE POLICY "Users view their own logs" ON user_activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all logs" ON user_activity_logs FOR ALL USING (is_admin());

CREATE POLICY "Admins manage finance audit" ON finance_audit_logs FOR ALL USING (is_admin());
CREATE POLICY "Admins manage reconciliations" ON reconciliations FOR ALL USING (is_admin());
