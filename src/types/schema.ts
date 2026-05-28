// ============================================================================
// File: src/types/schema.ts (Sanitized Clean Room)
// ============================================================================
import { z } from 'zod';

// ==========================================
// 1. HUSBANDRY & CORE
// ==========================================

export const AnimalSchema = z.object({
  id: z.string().uuid().optional(),
  entity_type: z.string(),
  parent_mob_id: z.string().uuid().nullable().optional(),
  census_count: z.number().int(),
  name: z.string().nullable().optional(),
  species: z.string().nullable().optional(),
  latin_name: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  distribution_map_url: z.string().nullable().optional(),
  hazard_rating: z.string().nullable().optional(),
  is_venomous: z.boolean(),
  weight_unit: z.string(),
  flying_weight_g: z.number().nullable().optional(),
  winter_weight_g: z.number().nullable().optional(),
  average_target_weight: z.number().nullable().optional(),
  date_of_birth: z.string().nullable().optional(), 
  is_dob_unknown: z.boolean(),
  gender: z.string().nullable().optional(),
  microchip_id: z.string().nullable().optional(),
  ring_number: z.string().nullable().optional(),
  has_no_id: z.boolean(),
  red_list_status: z.string(),
  description: z.string().nullable().optional(),
  special_requirements: z.string().nullable().optional(),
  critical_husbandry_notes: z.string().nullable().optional(),
  ambient_temp_only: z.boolean(),
  target_day_temp_c: z.number().nullable().optional(),
  target_night_temp_c: z.number().nullable().optional(),
  water_tipping_temp: z.number().nullable().optional(),
  target_humidity_min_percent: z.number().nullable().optional(),
  target_humidity_max_percent: z.number().nullable().optional(),
  misting_frequency: z.string().nullable().optional(),
  acquisition_date: z.string().nullable().optional(),
  acquisition_type: z.string().nullable().optional(),
  origin: z.string().nullable().optional(),
  origin_location: z.string().nullable().optional(),
  lineage_unknown: z.boolean(),
  sire_id: z.string().uuid().nullable().optional(),
  dam_id: z.string().uuid().nullable().optional(),
  is_boarding: z.boolean(),
  is_quarantine: z.boolean(),
  display_order: z.number().int().optional(),
  archived: z.boolean(),
  archive_reason: z.string().nullable().optional(),
  archive_type: z.string().nullable().optional(),
  archived_at: z.string().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  sign_content: z.string().nullable().optional(),
});

export const FeedItemSchema = z.object({
  food_type: z.string(),
  quantity: z.number()
});

export const DailyLogSchema = z.object({
  id: z.string().uuid().optional(),
  animal_id: z.string().uuid(),
  log_type: z.string(),
  log_date: z.string(),
  notes: z.string().nullable().optional(),
  weight_not_required: z.boolean().optional(),
  weight_grams: z.number().nullable().optional(),
  weight_unit: z.string().nullable().optional(),
  feed_details: z.array(FeedItemSchema).nullable().optional(),
  basking_temp_c: z.number().nullable().optional(),
  cool_temp_c: z.number().nullable().optional(),
  temperature_c: z.number().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const DailyRoundSchema = z.object({
  id: z.string().uuid().optional(),
  animal_id: z.string().uuid(),
  date: z.string(),
  shift: z.string(),
  section: z.string().nullable().optional(),
  is_alive: z.boolean(),
  water_checked: z.boolean(),
  locks_secured: z.boolean(),
  animal_issue_note: z.string().nullable().optional(),
  general_section_note: z.string().nullable().optional(),
  completed_by: z.string().uuid(),
  completed_at: z.string(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const FeedingScheduleSchema = z.object({
  id: z.string().uuid().optional(),
  animal_id: z.string().uuid(),
  scheduled_date: z.string(),
  food_type: z.string(),
  quantity: z.number(),
  calci_dust: z.boolean(),
  feed_not_required: z.boolean().optional(),
  additional_notes: z.string().nullable().optional(),
  is_completed: z.boolean().optional(),
  completed_at: z.string().nullable().optional(),
  completed_by: z.string().uuid().nullable().optional(),
  next_feed_date: z.string().nullable().optional(),
  interval_days: z.number().int().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// ==========================================
// 2. CLINICAL & MEDICAL
// ==========================================

export const ClinicalRecordSchema = z.object({
  id: z.string().uuid().optional(),
  animal_id: z.string().uuid(),
  record_type: z.string(),
  record_date: z.string(),
  soap_subjective: z.string(),
  soap_objective: z.string(),
  soap_assessment: z.string(),
  soap_plan: z.string(),
  weight_grams: z.number(),
  conductor_role: z.string(),
  conducted_by: z.string().uuid(),
  external_vet_name: z.string().nullable().optional(),
  external_vet_clinic: z.string().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid(),
  modified_by: z.string().uuid(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ClinicalAttachmentSchema = z.object({
  id: z.string().uuid().optional(),
  record_id: z.string().uuid(),
  file_name: z.string(),
  file_type: z.string(),
  file_url: z.string(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ClinicalScheduleSchema = z.object({
  id: z.string().uuid().optional(),
  animal_id: z.string().uuid(),
  schedule_type: z.string(),
  medication_name: z.string(),
  dosage: z.string(),
  route: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
  frequency: z.string(),
  status: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(), 
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid(),
  modified_by: z.string().uuid(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const MedicationLogSchema = z.object({
  id: z.string().uuid().optional(),
  schedule_id: z.string().uuid(),
  animal_id: z.string().uuid(),
  administered_at: z.string(),
  status: z.string(),
  notes: z.string().nullable().optional(),
  administered_by: z.string().uuid(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid(),
  modified_by: z.string().uuid(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const IsolationLogSchema = z.object({
  id: z.string().uuid().optional(),
  animal_id: z.string().uuid(),
  isolation_type: z.string().nullable().optional(),
  isolation_reason: z.string().nullable().optional(),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
  location: z.string(),
  reason_notes: z.string().nullable().optional(),
  clearance_notes: z.string().nullable().optional(),
  status: z.string().optional(),
  authorized_by: z.string().uuid().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid(),
  modified_by: z.string().uuid(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// ==========================================
// 3. SAFETY & COMPLIANCE
// ==========================================

export const IncidentSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string(),
  incident_date: z.string(),
  incident_type: z.string(),
  severity: z.string(),
  location: z.string(),
  description: z.string(),
  immediate_action_taken: z.string().nullable().optional(),
  animal_involved: z.boolean().optional(),
  first_aid_required: z.boolean().optional(),
  root_cause_analysis: z.string().nullable().optional(),
  prevention_action: z.string().nullable().optional(),
  investigation_status: z.string().optional(),
  investigation_officer_id: z.string().uuid().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const FirstAidLogSchema = z.object({
  id: z.string().uuid().optional(),
  incident_id: z.string().uuid().nullable().optional(),
  person_involved_name: z.string(),
  incident_date: z.string(),
  person_type: z.string(),
  location: z.string(),
  what_happened: z.string(),
  injury_details: z.string(),
  provided_aid: z.string(),
  witnesses: z.string().nullable().optional(),
  animal_involved: z.boolean().optional(),
  is_riddor_reportable: z.boolean().optional(),
  outcome: z.string().nullable().optional(),
  first_aider_id: z.string().uuid().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const SafetyDrillSchema = z.object({
  id: z.string().uuid().optional(),
  drill_date: z.string(),
  drill_type: z.string(),
  scenario_description: z.string(),
  areas_involved: z.string(),
  duration_seconds: z.number().int(),
  roll_call_completed: z.boolean().optional(),
  issues_observed: z.string().nullable().optional(),
  corrective_actions: z.string().nullable().optional(),
  status: z.string().optional(),
  conducted_by: z.string().uuid().nullable().optional(),
  is_simulation: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const MaintenanceTicketSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  category: z.string(),
  status: z.string(),
  priority: z.string(),
  location: z.string(),
  equipment_tag: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  reported_by: z.string().uuid().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// ==========================================
// 4. STAFF & ADMIN
// ==========================================

export const TaskSchema = z.object({
  id: z.string().uuid().optional(),
  animal_id: z.string().uuid().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  task_type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  completed_by: z.string().uuid().nullable().optional(),
  location: z.string().nullable().optional(),
  priority: z.string().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const TimesheetSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().nullable().optional(),
  shift_date: z.string(),
  clock_in_time: z.string(),
  clock_out_time: z.string().nullable().optional(),
  status: z.string(),
  notes: z.string().nullable().optional(),
  auto_clocked_out: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Full name is required'),
  initials: z.string().min(1, 'Initials are required').max(3, 'Initials must be 3 chars max'),
  email: z.string().email('Invalid email format').nullable().optional(),
  role: z.enum([
    'OWNER_DIRECTOR', 
    'HEAD_KEEPER', 
    'SENIOR_KEEPER', 
    'KEEPER', 
    'TRAINEE', 
    'MAINTENANCE', 
    'VET'
  ]).default('KEEPER'),
  avatar_url: z.string().nullable().optional(),
  pin: z.string().nullable().optional(),
  signature_url: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  cv_url: z.string().nullable().optional(),
  hr_notes: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  is_deleted: z.boolean().default(false),
  requires_password_change: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ShiftPatternSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  monday: z.boolean().default(false),
  tuesday: z.boolean().default(false),
  wednesday: z.boolean().default(false),
  thursday: z.boolean().default(false),
  friday: z.boolean().default(false),
  saturday: z.boolean().default(false),
  sunday: z.boolean().default(false),
  start_time: z.string(), 
  end_time: z.string(),   
  assigned_area: z.string().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ShiftSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  start_time: z.string(),
  end_time: z.string(),
  assigned_area: z.string().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const LeaveRequestSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  reviewed_by: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const RolePermissionSchema = z.object({
  id: z.string().uuid().optional(),
  role: z.string(),
  permission: z.string(),
  is_deleted: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const OperationalListSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  modified_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// ==========================================
// 5. SETTINGS & ZLA
// ==========================================

export const OrganisationSchema = z.object({
  id: z.string().uuid().optional(),
  org_name: z.string().min(1, 'Organisation Name is required'),
  logo_url: z.string().nullable().optional(),
  contact_email: z.string().email('Invalid email').nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  zla_license_number: z.string().nullable().optional(),
  official_website: z.string().nullable().optional(),
  adoption_portal: z.string().nullable().optional(),
  is_deleted: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ZLADocumentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  file_url: z.string().min(1),
  upload_date: z.string(),
  is_deleted: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  _modified: z.string().optional(), // Kept for legacy compatibility if external system reads this, but updated_at is primarily used.
});

export const InternalMovementSchema = z.object({
  id: z.string().uuid().optional(),
  animal_id: z.string().uuid(),
  movement_date: z.string(),
  from_location: z.string().nullable().optional(),
  to_location: z.string(),
  reason_notes: z.string().nullable().optional(),
  moved_by: z.string().uuid(),
  is_deleted: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ExternalTransferSchema = z.object({
  id: z.string().uuid().optional(),
  animal_id: z.string().uuid(),
  transfer_type: z.string(), 
  transfer_date: z.string(),
  entity_name: z.string(),
  contact_details: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  authorized_by: z.string().uuid(),
  is_deleted: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// ==========================================
// 6. INFERRED TYPES FOR UI CONSUMPTION
// ==========================================

export type Animal = z.infer<typeof AnimalSchema>;
export type FeedItem = z.infer<typeof FeedItemSchema>;
export type DailyLog = z.infer<typeof DailyLogSchema>;
export type DailyRound = z.infer<typeof DailyRoundSchema>;
export type FeedingSchedule = z.infer<typeof FeedingScheduleSchema>;
export type Shift = z.infer<typeof ShiftSchema>;
export type ShiftPattern = z.infer<typeof ShiftPatternSchema>;
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;
export type ClinicalRecord = z.infer<typeof ClinicalRecordSchema>;
export type ClinicalAttachment = z.infer<typeof ClinicalAttachmentSchema>;
export type ClinicalSchedule = z.infer<typeof ClinicalScheduleSchema>;
export type MedicationLog = z.infer<typeof MedicationLogSchema>;
export type IsolationLog = z.infer<typeof IsolationLogSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type FirstAidLog = z.infer<typeof FirstAidLogSchema>;
export type SafetyDrill = z.infer<typeof SafetyDrillSchema>;
export type MaintenanceTicket = z.infer<typeof MaintenanceTicketSchema>;
export type InternalMovement = z.infer<typeof InternalMovementSchema>;
export type ExternalTransfer = z.infer<typeof ExternalTransferSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Timesheet = z.infer<typeof TimesheetSchema>;
export type User = z.infer<typeof UserSchema>;
export type RolePermission = z.infer<typeof RolePermissionSchema>;
export type OperationalList = z.infer<typeof OperationalListSchema>;
export type Organisation = z.infer<typeof OrganisationSchema>;
export type ZLADocument = z.infer<typeof ZLADocumentSchema>;