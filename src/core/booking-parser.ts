/**
 * Booking Dump Parser
 * Extracts structured data from pasted booking confirmations
 * Handles emails, PDFs, and various booking formats
 */

interface ParsedBooking {
  type: 'flight' | 'hotel' | 'restaurant' | 'activity' | 'transport'
  name: string
  confirmationNumber?: string
  date: string
  time?: string
  endDate?: string
  location: string
  address?: string
  price?: string
  guests?: number
  notes?: string[]
  coordinates?: { lat: number, lng: number }
}

export class BookingParser {
  // Common booking platforms patterns
  private patterns = {
    flight: {
      airlines: [
        'lufthansa', 'ryanair', 'easyjet', 'british airways', 'klm', 
        'air france', 'united', 'american airlines', 'delta', 'emirates'
      ],
      keywords: ['flight', 'boarding', 'departure', 'arrival', 'gate', 'terminal'],
      confirmationPattern: /(?:confirmation|booking|reference)[\s:#]*([A-Z0-9]{6})/i,
      flightPattern: /([A-Z]{2,3})\s*(\d{1,4})/,
      dateTimePattern: /(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4}).*?(\d{1,2}):(\d{2})/
    },
    hotel: {
      platforms: ['booking.com', 'hotels.com', 'expedia', 'airbnb', 'hostelworld'],
      keywords: ['check-in', 'check-out', 'nights', 'room', 'accommodation'],
      confirmationPattern: /(?:confirmation|booking|reference)[\s:#]*([A-Z0-9\-]+)/i,
      checkInPattern: /check[\s-]?in:?\s*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4})/i,
      checkOutPattern: /check[\s-]?out:?\s*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4})/i
    },
    restaurant: {
      platforms: ['opentable', 'resy', 'bookatable', 'quandoo', 'thefork'],
      keywords: ['reservation', 'table', 'guests', 'party size', 'dining'],
      timePattern: /(\d{1,2}):(\d{2})\s*(PM|AM|pm|am)?/,
      guestsPattern: /(\d+)\s*(?:guests?|people|persons?|party size)/i
    }
  }

  /**
   * Main parsing function - determines type and extracts data
   */
  parseBookingDump(text: string): ParsedBooking[] {
    const bookings: ParsedBooking[] = []
    
    // Clean and normalize text
    const normalizedText = this.normalizeText(text)
    
    // Split into potential separate bookings
    const segments = this.segmentBookings(normalizedText)
    
    for (const segment of segments) {
      const bookingType = this.detectBookingType(segment)
      
      if (bookingType) {
        const parsed = this.parseByType(segment, bookingType)
        if (parsed) {
          bookings.push(parsed)
        }
      }
    }
    
    // Sort by date
    bookings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    return bookings
  }

  /**
   * Detect booking type from text content
   */
  private detectBookingType(text: string): 'flight' | 'hotel' | 'restaurant' | 'activity' | 'transport' | null {
    const lower = text.toLowerCase()
    
    // Count keyword matches for each type
    const scores = {
      flight: 0,
      hotel: 0,
      restaurant: 0,
      activity: 0,
      transport: 0
    }
    
    // Check flight indicators
    for (const keyword of this.patterns.flight.keywords) {
      if (lower.includes(keyword)) scores.flight++
    }
    for (const airline of this.patterns.flight.airlines) {
      if (lower.includes(airline)) scores.flight += 2
    }
    
    // Check hotel indicators
    for (const keyword of this.patterns.hotel.keywords) {
      if (lower.includes(keyword)) scores.hotel++
    }
    for (const platform of this.patterns.hotel.platforms) {
      if (lower.includes(platform)) scores.hotel += 2
    }
    
    // Check restaurant indicators
    for (const keyword of this.patterns.restaurant.keywords) {
      if (lower.includes(keyword)) scores.restaurant++
    }
    
    // Find highest scoring type
    const maxScore = Math.max(...Object.values(scores))
    if (maxScore === 0) return null
    
    return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as any
  }

  /**
   * Parse booking based on detected type
   */
  private parseByType(text: string, type: string): ParsedBooking | null {
    switch (type) {
      case 'flight':
        return this.parseFlight(text)
      case 'hotel':
        return this.parseHotel(text)
      case 'restaurant':
        return this.parseRestaurant(text)
      default:
        return this.parseGeneric(text, type as any)
    }
  }

  /**
   * Parse flight booking
   */
  private parseFlight(text: string): ParsedBooking | null {
    const booking: Partial<ParsedBooking> = {
      type: 'flight'
    }
    
    // Extract confirmation number
    const confirmMatch = text.match(this.patterns.flight.confirmationPattern)
    if (confirmMatch) {
      booking.confirmationNumber = confirmMatch[1]
    }
    
    // Extract flight number
    const flightMatch = text.match(this.patterns.flight.flightPattern)
    if (flightMatch) {
      booking.name = `Flight ${flightMatch[1]}${flightMatch[2]}`
    }
    
    // Extract airports
    const airportPattern = /from\s+([A-Z]{3})\s+to\s+([A-Z]{3})/i
    const airportMatch = text.match(airportPattern)
    if (airportMatch) {
      booking.location = `${airportMatch[1]} → ${airportMatch[2]}`
    }
    
    // Extract date and time
    const dateTimeMatch = text.match(this.patterns.flight.dateTimePattern)
    if (dateTimeMatch) {
      const [_, day, month, year, hour, minute] = dateTimeMatch
      booking.date = `${year}-${this.monthToNumber(month)}-${day.padStart(2, '0')}`
      booking.time = `${hour.padStart(2, '0')}:${minute}`
    }
    
    // Extract price
    const priceMatch = text.match(/[€$£¥]\s*(\d+(?:\.\d{2})?)/i)
    if (priceMatch) {
      booking.price = priceMatch[0]
    }
    
    return booking.name ? booking as ParsedBooking : null
  }

  /**
   * Parse hotel booking
   */
  private parseHotel(text: string): ParsedBooking | null {
    const booking: Partial<ParsedBooking> = {
      type: 'hotel'
    }
    
    // Extract hotel name (usually after "at" or before "hotel")
    const hotelNamePattern = /(?:at|hotel|hostel|accommodation)\s+([A-Z][A-Za-z\s&]+?)(?:\n|,|\.)/
    const nameMatch = text.match(hotelNamePattern)
    if (nameMatch) {
      booking.name = nameMatch[1].trim()
    }
    
    // Extract confirmation
    const confirmMatch = text.match(this.patterns.hotel.confirmationPattern)
    if (confirmMatch) {
      booking.confirmationNumber = confirmMatch[1]
    }
    
    // Extract check-in date
    const checkInMatch = text.match(this.patterns.hotel.checkInPattern)
    if (checkInMatch) {
      booking.date = this.parseDate(checkInMatch[1])
    }
    
    // Extract check-out date
    const checkOutMatch = text.match(this.patterns.hotel.checkOutPattern)
    if (checkOutMatch) {
      booking.endDate = this.parseDate(checkOutMatch[1])
    }
    
    // Extract address
    const addressPattern = /(?:address|located at|location):?\s*([^\n]+)/i
    const addressMatch = text.match(addressPattern)
    if (addressMatch) {
      booking.address = addressMatch[1].trim()
      booking.location = this.extractCity(addressMatch[1])
    }
    
    // Extract price
    const pricePattern = /(?:total|price|amount):?\s*([€$£¥]\s*\d+(?:\.\d{2})?)/i
    const priceMatch = text.match(pricePattern)
    if (priceMatch) {
      booking.price = priceMatch[1]
    }
    
    // Extract number of guests
    const guestsPattern = /(\d+)\s*(?:adults?|guests?)/i
    const guestsMatch = text.match(guestsPattern)
    if (guestsMatch) {
      booking.guests = parseInt(guestsMatch[1])
    }
    
    return booking.name ? booking as ParsedBooking : null
  }

  /**
   * Parse restaurant booking
   */
  private parseRestaurant(text: string): ParsedBooking | null {
    const booking: Partial<ParsedBooking> = {
      type: 'restaurant'
    }
    
    // Extract restaurant name
    const namePattern = /(?:restaurant|reservation at|table at)\s+([A-Z][A-Za-z\s&']+?)(?:\n|,|\.)/i
    const nameMatch = text.match(namePattern)
    if (nameMatch) {
      booking.name = nameMatch[1].trim()
    }
    
    // Extract date
    const datePattern = /(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})/
    const dateMatch = text.match(datePattern)
    if (dateMatch) {
      const [_, day, month, year] = dateMatch
      booking.date = `${year}-${this.monthToNumber(month)}-${day.padStart(2, '0')}`
    }
    
    // Extract time
    const timeMatch = text.match(this.patterns.restaurant.timePattern)
    if (timeMatch) {
      let [_, hour, minute, ampm] = timeMatch
      if (ampm?.toLowerCase() === 'pm' && parseInt(hour) < 12) {
        hour = String(parseInt(hour) + 12)
      }
      booking.time = `${hour.padStart(2, '0')}:${minute}`
    }
    
    // Extract number of guests
    const guestsMatch = text.match(this.patterns.restaurant.guestsPattern)
    if (guestsMatch) {
      booking.guests = parseInt(guestsMatch[1])
    }
    
    // Extract address if present
    const addressPattern = /(?:at|address|location):?\s*([^\n]+)/i
    const addressMatch = text.match(addressPattern)
    if (addressMatch && !addressMatch[1].includes('restaurant')) {
      booking.address = addressMatch[1].trim()
      booking.location = this.extractCity(addressMatch[1])
    }
    
    return booking.name ? booking as ParsedBooking : null
  }

  /**
   * Generic parser for activities and transport
   */
  private parseGeneric(text: string, type: 'activity' | 'transport'): ParsedBooking | null {
    const booking: Partial<ParsedBooking> = { type }
    
    // Try to extract name (first line often contains it)
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length > 0) {
      booking.name = lines[0].substring(0, 50).trim()
    }
    
    // Extract date
    const datePattern = /(\d{1,2})[\s\/\-](\w+)[\s\/\-](\d{2,4})/
    const dateMatch = text.match(datePattern)
    if (dateMatch) {
      booking.date = this.parseDate(dateMatch[0])
    }
    
    // Extract time
    const timePattern = /(\d{1,2}):(\d{2})/
    const timeMatch = text.match(timePattern)
    if (timeMatch) {
      booking.time = timeMatch[0]
    }
    
    // Extract location/address
    const addressPattern = /(?:at|address|location|venue):?\s*([^\n]+)/i
    const addressMatch = text.match(addressPattern)
    if (addressMatch) {
      booking.address = addressMatch[1].trim()
      booking.location = this.extractCity(addressMatch[1])
    }
    
    return booking.name ? booking as ParsedBooking : null
  }

  /**
   * Segment text into individual bookings
   */
  private segmentBookings(text: string): string[] {
    // Split by common separators
    const segments: string[] = []
    
    // Split by confirmation headers
    const confirmationSplit = text.split(/(?:confirmation|booking reference|order)/i)
    
    for (const segment of confirmationSplit) {
      if (segment.trim().length > 50) { // Minimum viable booking text
        segments.push(segment.trim())
      }
    }
    
    // If no clear segments, return whole text
    if (segments.length === 0) {
      segments.push(text)
    }
    
    return segments
  }

  /**
   * Normalize text for easier parsing
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n€£¥]/g, '') // Remove non-printable chars except currency
      .trim()
  }

  /**
   * Extract city from address
   */
  private extractCity(address: string): string {
    // Common city patterns
    const cityPatterns = [
      /,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\d{5}|\w{2,3}\s+\w{3})?$/, // City before postal
      /\b(Berlin|London|Paris|Tokyo|New York|Bangkok|Barcelona|Amsterdam|Rome)\b/i
    ]
    
    for (const pattern of cityPatterns) {
      const match = address.match(pattern)
      if (match) {
        return match[1]
      }
    }
    
    return address.split(',')[0].trim() // Fallback to first part
  }

  /**
   * Parse various date formats
   */
  private parseDate(dateStr: string): string {
    const cleaned = dateStr.replace(/[\s\-\/]+/g, ' ').trim()
    const parts = cleaned.split(' ')
    
    let day: string, month: string, year: string
    
    // Try different formats
    if (parts.length === 3) {
      if (parts[1].match(/[A-Za-z]/)) {
        // DD Month YYYY
        [day, month, year] = parts
        month = this.monthToNumber(month)
      } else {
        // DD MM YYYY or MM DD YYYY
        if (parseInt(parts[0]) > 12) {
          [day, month, year] = parts
        } else {
          [month, day, year] = parts
        }
      }
    } else {
      return dateStr // Return original if can't parse
    }
    
    // Ensure 4-digit year
    if (year.length === 2) {
      year = '20' + year
    }
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  /**
   * Convert month name to number
   */
  private monthToNumber(month: string): string {
    const months: Record<string, string> = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    }
    
    const lower = month.toLowerCase()
    for (const [key, value] of Object.entries(months)) {
      if (lower.startsWith(key)) {
        return value
      }
    }
    
    return month.padStart(2, '0') // Assume it's already a number
  }

  /**
   * Convert parsed bookings to fixed time slots for day planner
   */
  toFixedTimeSlots(bookings: ParsedBooking[]): any[] {
    return bookings.map(booking => ({
      date: booking.date,
      time: booking.time || '12:00',
      activity: {
        name: booking.name,
        type: booking.type,
        address: booking.address || booking.location,
        duration: this.estimateDuration(booking.type),
        price: booking.price || 'Paid',
        booking: booking.confirmationNumber
      }
    }))
  }

  /**
   * Estimate activity duration based on type
   */
  private estimateDuration(type: string): number {
    const durations: Record<string, number> = {
      flight: 120,
      hotel: 30, // Check-in/out time
      restaurant: 90,
      activity: 120,
      transport: 60
    }
    
    return durations[type] || 60
  }
}

// Example usage showing the power of booking dump
export function demonstrateBookingParser() {
  const parser = new BookingParser()
  
  const exampleDump = `
Booking Confirmation
Booking.com Confirmation Number: ABC123XYZ
Hotel Adlon Kempinski Berlin
Check-in: 15 March 2024
Check-out: 18 March 2024
Address: Unter den Linden 77, 10117 Berlin
2 Adults
Total Price: €1,200

---

Lufthansa Flight Confirmation
Confirmation: XYZABC
Flight LH992 
From LHR to BER
15 March 2024 at 09:30
Terminal 2, Gate B35
€250

---

OpenTable Reservation
Restaurant Tim Raue
16 March 2024 at 19:30
2 guests
Rudi-Dutschke-Straße 26, Berlin
  `
  
  const parsed = parser.parseBookingDump(exampleDump)
  
  console.log('=== Parsed Bookings ===')
  for (const booking of parsed) {
    console.log(`${booking.type.toUpperCase()}: ${booking.name}`)
    console.log(`  Date: ${booking.date} ${booking.time || ''}`)
    console.log(`  Location: ${booking.location}`)
    if (booking.confirmationNumber) {
      console.log(`  Confirmation: ${booking.confirmationNumber}`)
    }
    console.log('')
  }
  
  // Convert to time slots for day planner
  const timeSlots = parser.toFixedTimeSlots(parsed)
  console.log('=== Fixed Time Slots for Day Planner ===')
  console.log(JSON.stringify(timeSlots, null, 2))
}