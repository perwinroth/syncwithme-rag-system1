export interface TravelIntent {
    destination: string;
    dates?: {
        start: string;
        end: string;
    };
    interests: string[];
    budgetTier: 'low' | 'medium' | 'high' | 'luxury';
    groupType: 'solo' | 'couple' | 'friends' | 'family';
    pace: 'relaxed' | 'moderate' | 'intensive';
    originalText: string;
    confidence: number;
}
export interface SuccessPattern {
    id: string;
    destination: string;
    category: string;
    venues: Venue[];
    itineraryStructure?: DayPlan[];
    budgetTier: string;
    successRate: number;
    userSatisfaction: number;
    metadata: {
        source: string;
        lastUpdated: string;
        bookingPattern: string;
        localInsights: string[];
    };
}
export interface Venue {
    name: string;
    type: string;
    address?: string;
    priceRange: string;
    bookingMethod: string;
    rating: number;
    coordinates?: {
        lat: number;
        lng: number;
    };
    openingHours?: string;
    website?: string;
    specialNotes?: string[];
}
export interface DayPlan {
    day: number;
    activities: Activity[];
    budget: string;
    notes?: string;
}
export interface Activity {
    name: string;
    type: string;
    duration: string;
    cost: string;
    location: string;
    description?: string;
}
export interface LanguagePattern {
    id: string;
    intent: string;
    phrases: string[];
    confidence: number;
    mapsTo: {
        budgetTier?: string;
        interests?: string[];
        pace?: string;
        groupType?: string;
    };
    examples: string[];
}
export interface RAGResult {
    type: 'success_pattern' | 'language_pattern';
    content: SuccessPattern | LanguagePattern;
    confidence: number;
    source: string;
}
export interface TravelRecommendation {
    venues: Venue[];
    itinerary?: DayPlan[];
    confidence: number;
    reasoning: string;
    alternatives?: Venue[];
    localTips: string[];
    budgetBreakdown?: {
        accommodation: string;
        activities: string;
        food: string;
        transport: string;
        total: string;
    };
}
export interface RAGQueryRequest {
    userMessage: string;
    context?: {
        previousMessages?: string[];
        userPreferences?: Partial<TravelIntent>;
        tripId?: string;
    };
}
export interface RAGQueryResponse {
    intent: TravelIntent;
    recommendations: TravelRecommendation;
    confidence: number;
    processingTime: number;
    sources: string[];
}
//# sourceMappingURL=index.d.ts.map