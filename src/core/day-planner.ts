/**
 * Smart Day Planner Algorithm
 * Creates realistic, optimized daily itineraries with proper timing
 * Includes meals, coffee breaks, and travel time
 */

import { AffiliateEngine } from './affiliate-engine'

interface Activity {
  name: string
  type: string
  address: string
  duration: number // minutes
  price: string
  openTime?: string
  closeTime?: string
  booking?: string
  needsReservation?: boolean
  coordinates?: { lat: number, lng: number }
}

interface TimeSlot {
  time: string
  activity: Activity
  travelTime?: number // minutes to get here from previous location
  affiliateLink?: string
  tips?: string[]
}

interface DayPlan {
  date: string
  dayOfWeek: string
  slots: TimeSlot[]
  totalCost: string
  walkingDistance: number // km
  warnings?: string[]
}

export class DayPlanner {
  private affiliateEngine: AffiliateEngine

  constructor() {
    this.affiliateEngine = new AffiliateEngine()
  }

  /**
   * Create optimized day plan based on user preferences and fixed bookings
   */
  createDayPlan(
    date: string,
    availableActivities: Activity[],
    fixedBookings: TimeSlot[] = [],
    preferences: {
      pace: 'relaxed' | 'moderate' | 'intensive'
      budget: 'low' | 'medium' | 'high'
      interests: string[]
      groupType: 'solo' | 'couple' | 'friends' | 'family'
    }
  ): DayPlan {
    const dayOfWeek = this.getDayOfWeek(date)
    const slots: TimeSlot[] = []
    
    // Define time structure based on pace
    const schedule = this.getScheduleTemplate(preferences.pace)
    
    // Start with fixed bookings (hotel checkout, flights, etc)
    const plannedTimes = new Set(fixedBookings.map(b => b.time))
    slots.push(...fixedBookings)

    // Fill in the day intelligently
    for (const timeSlot of schedule) {
      if (plannedTimes.has(timeSlot.time)) continue

      const activity = this.selectBestActivity(
        timeSlot.type,
        availableActivities,
        preferences,
        dayOfWeek,
        timeSlot.time
      )

      if (activity) {
        const slot = this.createTimeSlot(timeSlot.time, activity)
        slots.push(slot)
        plannedTimes.add(timeSlot.time)
      }
    }

    // Sort by time and calculate travel times
    slots.sort((a, b) => this.timeToMinutes(a.time) - this.timeToMinutes(b.time))
    this.addTravelTimes(slots)

    // Add warnings for potential issues
    const warnings = this.generateWarnings(slots, dayOfWeek)

    return {
      date,
      dayOfWeek,
      slots,
      totalCost: this.calculateTotalCost(slots),
      walkingDistance: this.calculateWalkingDistance(slots),
      warnings
    }
  }

  /**
   * Get schedule template based on pace preference
   */
  private getScheduleTemplate(pace: 'relaxed' | 'moderate' | 'intensive') {
    const templates = {
      relaxed: [
        { time: '09:30', type: 'breakfast' },
        { time: '11:00', type: 'morning_activity' },
        { time: '13:30', type: 'lunch' },
        { time: '15:30', type: 'afternoon_activity' },
        { time: '17:30', type: 'coffee' },
        { time: '19:30', type: 'dinner' },
        { time: '22:00', type: 'evening_activity' }
      ],
      moderate: [
        { time: '09:00', type: 'breakfast' },
        { time: '10:30', type: 'morning_activity' },
        { time: '13:00', type: 'lunch' },
        { time: '14:30', type: 'afternoon_activity' },
        { time: '17:00', type: 'coffee' },
        { time: '19:00', type: 'dinner' },
        { time: '21:30', type: 'evening_activity' },
        { time: '23:30', type: 'nightlife' }
      ],
      intensive: [
        { time: '08:00', type: 'breakfast' },
        { time: '09:30', type: 'morning_activity' },
        { time: '12:00', type: 'quick_lunch' },
        { time: '13:00', type: 'afternoon_activity_1' },
        { time: '15:30', type: 'afternoon_activity_2' },
        { time: '17:30', type: 'coffee' },
        { time: '19:00', type: 'dinner' },
        { time: '21:00', type: 'evening_activity' },
        { time: '23:00', type: 'nightlife' },
        { time: '02:00', type: 'late_night_food' }
      ]
    }

    return templates[pace]
  }

  /**
   * Select best activity for time slot
   */
  private selectBestActivity(
    slotType: string,
    availableActivities: Activity[],
    preferences: any,
    dayOfWeek: string,
    time: string
  ): Activity | null {
    // Filter by type and availability
    let suitable = availableActivities.filter(activity => {
      // Match activity type to slot type
      if (slotType.includes('breakfast') && !activity.type.includes('breakfast') && !activity.type.includes('cafe')) {
        return false
      }
      if (slotType.includes('lunch') && !activity.type.includes('restaurant') && !activity.type.includes('lunch')) {
        return false
      }
      if (slotType.includes('dinner') && !activity.type.includes('restaurant') && !activity.type.includes('dinner')) {
        return false
      }
      if (slotType.includes('coffee') && !activity.type.includes('cafe') && !activity.type.includes('coffee')) {
        return false
      }
      if (slotType.includes('nightlife') && !activity.type.includes('club') && !activity.type.includes('bar')) {
        return false
      }

      // Check if open at this time
      if (!this.isOpenAt(activity, time, dayOfWeek)) {
        return false
      }

      // Budget filter
      if (!this.matchesBudget(activity, preferences.budget)) {
        return false
      }

      return true
    })

    // Prioritize by interests
    suitable.sort((a, b) => {
      const aScore = this.scoreActivity(a, preferences.interests)
      const bScore = this.scoreActivity(b, preferences.interests)
      return bScore - aScore
    })

    return suitable[0] || null
  }

  /**
   * Create time slot with affiliate decision
   */
  private createTimeSlot(time: string, activity: Activity): TimeSlot {
    const affiliateDecision = this.affiliateEngine.shouldUseAffiliate({
      name: activity.name,
      type: activity.type,
      address: activity.address,
      price: activity.price,
      booking: activity.booking,
      needsReservation: activity.needsReservation
    })

    const slot: TimeSlot = {
      time,
      activity,
      tips: this.generateTips(activity, time)
    }

    if (affiliateDecision.useAffiliate) {
      slot.affiliateLink = affiliateDecision.url
    }

    return slot
  }

  /**
   * Generate helpful tips for each activity
   */
  private generateTips(activity: Activity, time: string): string[] {
    const tips: string[] = []

    // Time-specific tips
    const hour = parseInt(time.split(':')[0])
    
    if (activity.type.includes('restaurant')) {
      if (hour >= 12 && hour <= 14) {
        tips.push('Lunch rush - reservation recommended')
      }
      if (hour >= 19 && hour <= 21) {
        tips.push('Peak dinner time - expect wait without reservation')
      }
    }

    if (activity.type.includes('club')) {
      if (activity.name.toLowerCase().includes('berghain')) {
        tips.push('Dress code: Black/techno style')
        tips.push('Don\'t be too drunk or too sober')
        tips.push('Go in small groups or alone')
        tips.push('Rejection is common - have backup plan')
      } else {
        tips.push('Check dress code in advance')
      }
    }

    if (activity.type.includes('museum')) {
      tips.push('Audio guide available')
      if (hour >= 10 && hour <= 16) {
        tips.push('Peak hours - skip-the-line ticket worth it')
      }
    }

    if (activity.type.includes('cafe')) {
      tips.push('Good wifi for remote work')
      tips.push('Power outlets available')
    }

    return tips
  }

  /**
   * Add realistic travel times between activities
   */
  private addTravelTimes(slots: TimeSlot[]) {
    for (let i = 1; i < slots.length; i++) {
      const from = slots[i - 1].activity
      const to = slots[i].activity
      
      // Calculate based on coordinates or estimate
      const distance = this.estimateDistance(from, to)
      const travelTime = this.estimateTravelTime(distance)
      
      slots[i].travelTime = travelTime
    }
  }

  /**
   * Generate warnings for potential issues
   */
  private generateWarnings(slots: TimeSlot[], dayOfWeek: string): string[] {
    const warnings: string[] = []

    // Check for Monday closures
    if (dayOfWeek === 'Monday') {
      const hasMuseum = slots.some(s => s.activity.type.includes('museum'))
      if (hasMuseum) {
        warnings.push('Many museums closed on Mondays - verify opening hours')
      }
    }

    // Check for Sunday closures
    if (dayOfWeek === 'Sunday') {
      const hasShops = slots.some(s => s.activity.type.includes('shop'))
      if (hasShops) {
        warnings.push('Many shops closed on Sundays in Germany')
      }
    }

    // Check for timing conflicts
    for (let i = 1; i < slots.length; i++) {
      const prevEnd = this.timeToMinutes(slots[i - 1].time) + slots[i - 1].activity.duration
      const nextStart = this.timeToMinutes(slots[i].time)
      const travelTime = slots[i].travelTime || 0

      if (prevEnd + travelTime > nextStart) {
        warnings.push(`Tight timing between ${slots[i - 1].activity.name} and ${slots[i].activity.name}`)
      }
    }

    // Weather warnings
    const hasOutdoor = slots.some(s => 
      s.activity.type.includes('park') || 
      s.activity.type.includes('market') ||
      s.activity.type.includes('outdoor')
    )
    if (hasOutdoor) {
      warnings.push('Check weather forecast for outdoor activities')
    }

    return warnings
  }

  // Helper methods
  private getDayOfWeek(date: string): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const d = new Date(date)
    return days[d.getDay()]
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private isOpenAt(activity: Activity, time: string, dayOfWeek: string): boolean {
    // Special cases
    if (activity.name.toLowerCase().includes('berghain') && dayOfWeek === 'Monday') {
      return false // Berghain closed Mondays
    }

    if (!activity.openTime || !activity.closeTime) {
      return true // Assume open if no hours specified
    }

    const timeMin = this.timeToMinutes(time)
    const openMin = this.timeToMinutes(activity.openTime)
    const closeMin = this.timeToMinutes(activity.closeTime)

    // Handle overnight venues (clubs)
    if (closeMin < openMin) {
      return timeMin >= openMin || timeMin <= closeMin
    }

    return timeMin >= openMin && timeMin <= closeMin
  }

  private matchesBudget(activity: Activity, budget: string): boolean {
    const price = activity.price.toLowerCase()
    
    if (budget === 'low') {
      return price.includes('free') || 
             price.includes('€5') || 
             price.includes('€10') ||
             price.includes('€15') ||
             price.includes('budget')
    }
    
    if (budget === 'medium') {
      return !price.includes('€100') && 
             !price.includes('€200') && 
             !price.includes('luxury')
    }
    
    return true // High budget matches everything
  }

  private scoreActivity(activity: Activity, interests: string[]): number {
    let score = 0
    
    for (const interest of interests) {
      if (activity.type.toLowerCase().includes(interest.toLowerCase()) ||
          activity.name.toLowerCase().includes(interest.toLowerCase())) {
        score += 10
      }
    }
    
    return score
  }

  private estimateDistance(from: Activity, to: Activity): number {
    if (from.coordinates && to.coordinates) {
      // Haversine formula for real distance
      return this.haversineDistance(from.coordinates, to.coordinates)
    }
    
    // Rough estimate based on addresses
    if (from.address.includes('Mitte') && to.address.includes('Mitte')) {
      return 1.5
    }
    if (from.address.includes('Kreuzberg') && to.address.includes('Kreuzberg')) {
      return 1.0
    }
    
    return 3.0 // Default 3km between neighborhoods
  }

  private haversineDistance(coord1: any, coord2: any): number {
    const R = 6371 // Earth radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private estimateTravelTime(distance: number): number {
    // Walking speed: 4km/h
    // Add buffer for navigation
    return Math.ceil((distance / 4) * 60) + 5
  }

  private calculateTotalCost(slots: TimeSlot[]): string {
    let total = 0
    
    for (const slot of slots) {
      const priceMatch = slot.activity.price.match(/€(\d+)/)
      if (priceMatch) {
        total += parseInt(priceMatch[1])
      }
    }
    
    return `€${total}`
  }

  private calculateWalkingDistance(slots: TimeSlot[]): number {
    let total = 0
    
    for (let i = 1; i < slots.length; i++) {
      total += this.estimateDistance(slots[i - 1].activity, slots[i].activity)
    }
    
    return Math.round(total * 10) / 10
  }
}