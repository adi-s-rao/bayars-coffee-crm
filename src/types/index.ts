export type UserRole = 'rep' | 'manager'

export type LeadStatus =
  | 'cold_lead'
  | 'hot_lead'
  | 'customer'
  | 'competitor'

export type CheckInType =
  | 'visit'
  | 'demo'
  | 'workshop'
  | 'start_day'
  | 'end_day'
  | 'new_lead'

export type VisitType = 'visit' | 'demo' | 'workshop'

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
  cappuccino_price?: number
  remarks?: string
  sample_name?: string
  sample_quantity_grams?: number
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
  bean_brand?: string
  bean_amount_kg?: number
  distance_from_previous_km?: number
  created_at: string
}

export interface ScheduledVisit {
  id: string
  lead_id: string
  assigned_to: string
  scheduled_date: string
  visit_type: VisitType
  notes?: string
  completed: boolean
  created_by: string
  created_at: string
  updated_at: string
  leads?: { cafe_name: string; location_address?: string }
  profiles?: { full_name: string }
}

export interface Conversion {
  id: string
  lead_id: string
  converted_by: string
  beans_ordered_kg?: number
  bean_type?: string
  notes?: string
  created_at: string
  leads?: { cafe_name: string }
  profiles?: { full_name: string }
}

export const COFFEE_SKUS = [
  'Bayar Espresso Blend',
  'Bayar Single Origin Ethiopia',
  'Bayar Single Origin Colombia',
  'Bayar Single Origin Brazil',
  'Bayar Single Origin Kenya',
  'Bayar Single Origin Guatemala',
  'Bayar Decaf Blend',
  'Bayar Cold Brew Blend',
  'Bayar Signature Dark Roast',
  'Bayar Signature Medium Roast',
  'Bayar Signature Light Roast',
  'Bayar House Blend 1kg',
  'Bayar House Blend 250g',
  'Bayar Arabica Premium',
  'Bayar Robusta Blend',
  'Bayar Specialty Grade AAA',
  'Bayar Specialty Grade AA',
  'Bayar Washed Process',
  'Bayar Natural Process',
  'Bayar Honey Process',
  'Bayar Anaerobic Ferment',
  'Bayar Filter Blend',
  'Bayar Pour Over Blend',
  'Bayar Moka Pot Blend',
  'Bayar French Press Blend',
  'Bayar AeroPress Blend',
  'Bayar Lungo Blend',
  'Bayar Ristretto Blend',
  'Bayar Cappuccino Blend',
  'Bayar Latte Blend',
  'Bayar Flat White Blend',
  'Bayar Cortado Blend',
  'Bayar Macchiato Blend',
  'Bayar Cold Drip Blend',
  'Bayar Nitro Blend',
  'Bayar RTD Concentrate',
  'Bayar Seasonal Limited Edition',
  'Bayar Competition Grade',
  'Bayar Microlot Reserve',
  'Bayar Subscription Blend',
] as const

export type CoffeeSKU = typeof COFFEE_SKUS[number]
