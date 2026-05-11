export type UserRole = 'rep' | 'manager'

export type LeadStatus =
  | 'cold_lead'
  | 'hot_lead'
  | 'demo_scheduled'
  | 'customer'
  | 'competitor'

export type CheckInType =
  | 'visit'
  | 'demo'
  | 'workshop'
  | 'start_day'
  | 'end_day'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  email: string
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  created_by: string
  status: LeadStatus
  cafe_name: string
  latitude?: number
  longitude?: number
  location_address?: string
  poc_name?: string
  poc_contact?: string
  coffee_machine?: string
  current_bean_brand?: string
  bean_usage_kg?: number
  bean_price_per_kg?: number
  cappuccino_price?: number
  menu_image_url?: string
  remarks?: string
  demo_date?: string
  quoted_price?: number
  quoted_bean_name?: string
  calibration_visit_date?: string
  visit_notes?: string
  cs_handover_date?: string
  scheduled_date?: string
  scheduled_type?: CheckInType
  created_at: string
  updated_at: string
}

export interface CheckIn {
  id: string
  lead_id?: string
  user_id: string
  user_name: string
  type: CheckInType
  latitude?: number
  longitude?: number
  remarks?: string
  gate_pass_number?: string
  beans_used?: boolean
  bean_brand?: string
  bean_amount_kg?: number
  distance_from_previous_km?: number
  created_at: string
}
