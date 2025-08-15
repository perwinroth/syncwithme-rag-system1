/**
 * Smart Affiliate Link Engine
 * Converts venues to affiliate links ONLY where it makes sense
 * Maintains trust by never forcing inappropriate affiliates
 */

interface Venue {
  name: string
  type: string
  address: string
  price: string
  booking?: string
  needsReservation?: boolean
  hasSkipLine?: boolean
}

interface AffiliateDecision {
  useAffiliate: boolean
  platform?: string
  url?: string
  reason: string
  commission?: number
}

export class AffiliateEngine {
  // Affiliate partner configurations
  private affiliatePartners = {
    hotels: {
      'booking.com': {
        baseUrl: 'https://www.booking.com/searchresults.html',
        affiliateId: 'SYNCWITHME_AFF_ID',
        commission: 0.04 // 4%
      },
      'hostelworld': {
        baseUrl: 'https://www.hostelworld.com/findabed.php',
        affiliateId: 'SYNCWITHME_HW_ID',
        commission: 0.08 // 8%
      }
    },
    restaurants: {
      'opentable': {
        baseUrl: 'https://www.opentable.com/r/',
        affiliateId: 'SYNCWITHME_OT_ID',
        commission: 0.50 // $0.50 per booking
      },
      'resy': {
        baseUrl: 'https://resy.com/cities/',
        affiliateId: 'SYNCWITHME_RESY_ID',
        commission: 0.75 // $0.75 per booking
      }
    },
    activities: {
      'getyourguide': {
        baseUrl: 'https://www.getyourguide.com/',
        affiliateId: 'SYNCWITHME_GYG_ID',
        commission: 0.08 // 8%
      },
      'viator': {
        baseUrl: 'https://www.viator.com/',
        affiliateId: 'SYNCWITHME_VI_ID',
        commission: 0.05 // 5%
      }
    },
    flights: {
      'skyscanner': {
        baseUrl: 'https://www.skyscanner.com/transport/flights/',
        affiliateId: 'SYNCWITHME_SKY_ID',
        commission: 0.03 // 3%
      },
      'kayak': {
        baseUrl: 'https://www.kayak.com/flights/',
        affiliateId: 'SYNCWITHME_KY_ID',
        commission: 0.025 // 2.5%
      }
    },
    transport: {
      'omio': {
        baseUrl: 'https://www.omio.com/',
        affiliateId: 'SYNCWITHME_OMIO_ID',
        commission: 0.05 // 5%
      }
    }
  }

  // Never use affiliates for these
  private neverAffiliate = [
    'nightclub',
    'club',
    'techno',
    'street_food',
    'market',
    'free_attraction',
    'park',
    'beach',
    'viewpoint',
    'street_art',
    'local_bar',
    'dive_bar',
    'kebab',
    'food_truck',
    'public_space'
  ]

  // Specific venues that should NEVER have affiliates
  private blacklistedVenues = [
    'berghain',
    'fabric',
    'tresor',
    'golden gai',
    'khao san road',
    'camden market',
    'borough market',
    'east side gallery',
    'central park',
    'hyde park'
  ]

  /**
   * Main decision engine - determines if affiliate link should be used
   */
  shouldUseAffiliate(venue: Venue): AffiliateDecision {
    const venueLower = venue.name.toLowerCase()
    const typeLower = venue.type.toLowerCase()

    // Rule 1: Never affiliate blacklisted venues
    if (this.blacklistedVenues.some(blacklisted => venueLower.includes(blacklisted))) {
      return {
        useAffiliate: false,
        reason: 'Iconic venue - pay at location'
      }
    }

    // Rule 2: Never affiliate certain venue types
    if (this.neverAffiliate.some(type => typeLower.includes(type))) {
      return {
        useAffiliate: false,
        reason: this.getNoAffiliateReason(typeLower)
      }
    }

    // Rule 3: Free attractions never get affiliates
    if (venue.price?.toLowerCase().includes('free')) {
      return {
        useAffiliate: false,
        reason: 'Free attraction - no booking needed'
      }
    }

    // Rule 4: Smart affiliate decisions based on venue type
    if (typeLower.includes('hotel') || typeLower.includes('hostel')) {
      return this.createHotelAffiliate(venue)
    }

    if (typeLower.includes('restaurant') && venue.needsReservation) {
      return this.createRestaurantAffiliate(venue)
    }

    if (typeLower.includes('museum') && venue.hasSkipLine) {
      return this.createActivityAffiliate(venue, 'skip-the-line')
    }

    if (typeLower.includes('tour') || typeLower.includes('experience')) {
      return this.createActivityAffiliate(venue, 'tour')
    }

    // Default: No affiliate
    return {
      useAffiliate: false,
      reason: 'Direct booking or walk-in recommended'
    }
  }

  /**
   * Create hotel affiliate link
   */
  private createHotelAffiliate(venue: Venue): AffiliateDecision {
    const isHostel = venue.type.toLowerCase().includes('hostel')
    const partner = isHostel ? 'hostelworld' : 'booking.com'
    const config = this.affiliatePartners.hotels[partner]

    return {
      useAffiliate: true,
      platform: partner,
      url: this.generateAffiliateUrl(venue, config),
      reason: 'Advance booking recommended',
      commission: config.commission
    }
  }

  /**
   * Create restaurant affiliate link
   */
  private createRestaurantAffiliate(venue: Venue): AffiliateDecision {
    // Only for restaurants that actually need reservations
    if (!venue.needsReservation) {
      return {
        useAffiliate: false,
        reason: 'Walk-in restaurant - no reservation needed'
      }
    }

    const config = this.affiliatePartners.restaurants.opentable

    return {
      useAffiliate: true,
      platform: 'opentable',
      url: this.generateAffiliateUrl(venue, config),
      reason: 'Reservation essential (especially weekends)',
      commission: config.commission
    }
  }

  /**
   * Create activity affiliate link
   */
  private createActivityAffiliate(venue: Venue, type: string): AffiliateDecision {
    const config = this.affiliatePartners.activities.getyourguide

    return {
      useAffiliate: true,
      platform: 'getyourguide',
      url: this.generateAffiliateUrl(venue, config),
      reason: type === 'skip-the-line' 
        ? 'Skip the queue - worth it on busy days'
        : 'Advance booking saves time and guarantees spot',
      commission: config.commission
    }
  }

  /**
   * Generate affiliate URL with tracking
   */
  private generateAffiliateUrl(venue: Venue, config: any): string {
    const baseUrl = config.baseUrl
    const affiliateId = config.affiliateId
    const venueName = encodeURIComponent(venue.name)
    const location = encodeURIComponent(venue.address)

    return `${baseUrl}?aid=${affiliateId}&venue=${venueName}&location=${location}&utm_source=syncwithme&utm_medium=affiliate`
  }

  /**
   * Get appropriate reason for not using affiliate
   */
  private getNoAffiliateReason(type: string): string {
    const reasons = {
      'nightclub': 'Pay at door - no advance tickets',
      'club': 'Queue and pay at entrance',
      'street_food': 'Street vendor - cash only',
      'market': 'Browse and buy directly',
      'local_bar': 'Walk in and grab a seat',
      'dive_bar': 'No reservations - first come first served',
      'free': 'Free entry - no booking needed',
      'park': 'Public space - always open',
      'beach': 'Public beach - free access'
    }

    for (const [key, reason] of Object.entries(reasons)) {
      if (type.includes(key)) return reason
    }

    return 'Direct visit recommended'
  }

  /**
   * Calculate potential revenue from a trip itinerary
   */
  calculateTripRevenue(venues: Venue[]): {
    total: number
    breakdown: { venue: string, commission: number }[]
  } {
    const breakdown: { venue: string, commission: number }[] = []
    let total = 0

    for (const venue of venues) {
      const decision = this.shouldUseAffiliate(venue)
      if (decision.useAffiliate && decision.commission) {
        // Estimate booking value based on venue type
        const estimatedValue = this.estimateBookingValue(venue)
        const commission = estimatedValue * decision.commission
        
        breakdown.push({
          venue: venue.name,
          commission
        })
        
        total += commission
      }
    }

    return { total, breakdown }
  }

  /**
   * Estimate booking value for commission calculation
   */
  private estimateBookingValue(venue: Venue): number {
    const type = venue.type.toLowerCase()
    
    if (type.includes('hotel')) {
      // Extract price from string like "€100/night"
      const priceMatch = venue.price.match(/(\d+)/)
      return priceMatch ? parseInt(priceMatch[1]) * 3 : 300 // Assume 3 nights
    }
    
    if (type.includes('restaurant')) {
      return 1 // Fixed commission per booking
    }
    
    if (type.includes('tour') || type.includes('museum')) {
      const priceMatch = venue.price.match(/(\d+)/)
      return priceMatch ? parseInt(priceMatch[1]) : 25
    }
    
    return 50 // Default estimate
  }
}

// Example usage showing trust-first approach
export function demonstrateAffiliateEngine() {
  const engine = new AffiliateEngine()

  const venues: Venue[] = [
    {
      name: 'Hotel Adlon',
      type: 'hotel',
      address: 'Unter den Linden 77, Berlin',
      price: '€400/night',
      booking: 'https://adlon.de'
    },
    {
      name: 'Berghain',
      type: 'nightclub',
      address: 'Am Wriezener Bahnhof, Berlin',
      price: '€18-25',
      booking: 'Pay at door'
    },
    {
      name: 'Museum Island',
      type: 'museum',
      address: 'Bodestraße 1-3, Berlin',
      price: '€18',
      booking: 'Online available',
      hasSkipLine: true
    },
    {
      name: 'Mustafas Gemüse Kebap',
      type: 'street_food',
      address: 'Mehringdamm 32, Berlin',
      price: '€4-6',
      booking: 'Just queue'
    },
    {
      name: 'Restaurant Tim Raue',
      type: 'restaurant',
      address: 'Rudi-Dutschke-Straße 26, Berlin',
      price: '€150-200',
      booking: 'Essential',
      needsReservation: true
    }
  ]

  console.log('=== Smart Affiliate Decisions ===\n')
  
  for (const venue of venues) {
    const decision = engine.shouldUseAffiliate(venue)
    console.log(`${venue.name}:`)
    console.log(`  Affiliate: ${decision.useAffiliate ? '✅' : '❌'}`)
    console.log(`  Reason: ${decision.reason}`)
    if (decision.platform) {
      console.log(`  Platform: ${decision.platform}`)
    }
    console.log('')
  }

  const revenue = engine.calculateTripRevenue(venues)
  console.log('=== Estimated Revenue ===')
  console.log(`Total: €${revenue.total.toFixed(2)}`)
  console.log('Breakdown:')
  revenue.breakdown.forEach(item => {
    console.log(`  ${item.venue}: €${item.commission.toFixed(2)}`)
  })
}