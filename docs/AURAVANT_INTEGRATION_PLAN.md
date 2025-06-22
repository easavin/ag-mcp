# Auravant Integration Plan

## Executive Summary

This document outlines the comprehensive integration plan for adding Auravant platform support to the AgMCP application. Auravant is a leading South American agricultural platform with unique livestock management capabilities alongside traditional crop management features.

**Key Differentiators:**
- **Livestock Management**: Comprehensive herd and paddock operations
- **Work Order System**: Built-in planning and recommendation engine
- **Simplified Auth**: Bearer token authentication (no OAuth2 complexity)
- **Regional Focus**: Optimized for South American agriculture
- **Multi-Language**: Spanish, English, Portuguese support

## Current Architecture Analysis

### Existing John Deere Integration Pattern

The application currently has a well-established pattern for agricultural platform integration:

**Authentication Layer:**
- `src/lib/johndeere-auth.ts` - OAuth2 flow implementation
- `src/app/api/auth/johndeere/` - Authentication API routes
- `prisma/schema.prisma` - `JohnDeereToken` model

**API Client Layer:**
- `src/lib/johndeere.ts` - Core API client
- `src/lib/johndeere-client.ts` - HTTP client wrapper
- `src/lib/johndeere-api.ts` - API endpoint definitions

**Data Layer:**
- `User` model with `johnDeereConnected` field
- `FieldOperation` model for operation data
- Comprehensive data normalization

**UI Layer:**
- `src/components/JohnDeereConnectionHelper.tsx` - Connection management
- `src/components/IntegrationsModal.tsx` - Platform selection
- `src/components/DataSourceIndicator.tsx` - Data attribution

## Auravant Integration Architecture

### Multi-Platform Architecture Design

The integration will follow a multi-platform architecture allowing users to connect John Deere, Climate FieldView, and Auravant simultaneously.

### Key Architectural Differences

**Authentication Simplification:**
- **Auravant**: Bearer token (session-based)
- **John Deere**: OAuth2 with refresh tokens
- **FieldView**: OAuth2 with API keys

**Unique Data Models:**
- **Livestock Management**: Herds, paddocks, transactions
- **Work Orders**: Planning, recommendations, execution tracking
- **Labour Operations**: Four distinct operation types
- **Spatial Data**: WKT format vs GeoJSON

## Database Schema Updates

### New Models for Auravant

```prisma
// Auravant authentication tokens
model AuravantToken {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Bearer token authentication
  accessToken String
  tokenType   String   @default("Bearer")
  
  // Extension information
  extensionId String?
  
  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  expiresAt   DateTime?
  
  @@map("auravant_tokens")
}

// Livestock management (unique to Auravant)
model LivestockHerd {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Auravant identifiers
  herdUuid    String   @unique
  herdName    String
  
  // Herd details
  animalCount Int
  weight      Float?
  weightUnit  String   @default("Kg")
  typeId      Int
  
  // Location
  paddockId   Int?
  fieldId     Int?
  farmId      Int?
  
  // Metadata
  dataSource  String   @default("auravant")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("livestock_herds")
}

// Work orders for planning
model WorkOrder {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Auravant identifiers
  workOrderUuid String  @unique
  name         String
  
  // Planning details
  yeargroup    Int
  date         DateTime
  notes        String?
  status       String   @default("planned")
  
  // Recommendations
  recommendations Json?
  
  // Associated operations
  labourOperations String[] // UUIDs of associated operations
  
  // Metadata
  dataSource   String   @default("auravant")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@map("work_orders")
}

// Enhanced user model
model User {
  // ... existing fields ...
  
  // Platform connections
  auravantConnected Boolean @default(false)
  
  // Platform tokens
  auravantToken     AuravantToken?
  
  // Auravant-specific data
  livestockHerds    LivestockHerd[]
  workOrders        WorkOrder[]
  
  // ... rest of existing model ...
}

// Enhanced field operations
model FieldOperation {
  // ... existing fields ...
  
  // Data source tracking
  dataSource    String   @default("johndeere") // johndeere, fieldview, auravant
  
  // Auravant-specific fields
  labourTypeId  Int?     // Auravant labour type (1-4)
  yeargroup     Int?     // Auravant season grouping
  status        Int?     // 1=Planned, 2=Executed, 3=Cancelled
  
  // Work order association
  workOrderUuid String?
  
  // Livestock associations (for grazing operations)
  herdUuid      String?
  paddockId     Int?
  
  // ... rest of existing model ...
}
```

## Implementation Phases

### Phase 1: Foundation Setup (Weeks 1-2)

**Week 1: Database & Environment Setup**
- [ ] Update Prisma schema with Auravant models
- [ ] Create database migration scripts
- [ ] Add Auravant environment variables
- [ ] Update TypeScript types

**Environment Variables:**
```bash
# Auravant Configuration
AURAVANT_API_BASE_URL=https://api.auravant.com/api
AURAVANT_EXTENSION_ID=your_extension_id
AURAVANT_TEST_TOKEN=your_test_token
AURAVANT_ENVIRONMENT=development
ENABLE_AURAVANT_LIVESTOCK=true
ENABLE_AURAVANT_WORKORDERS=true
```

**Week 2: Core Infrastructure**
- [ ] Create `src/lib/auravant/` directory structure
- [ ] Implement base authentication system
- [ ] Create API client foundation
- [ ] Add error handling patterns

### Phase 2: Auravant API Implementation (Weeks 3-4)

**Week 3: Authentication & Core APIs**

**File Structure:**
```
src/lib/auravant/
├── auth.ts              # Bearer token authentication
├── client.ts            # HTTP client with error handling
├── api.ts               # API endpoint definitions
├── types.ts             # TypeScript interfaces
├── normalizer.ts        # Data normalization
├── livestock.ts         # Livestock-specific operations
├── workorders.ts        # Work order management
└── __tests__/           # Unit tests
```

**Core Implementation:**
```typescript
// src/lib/auravant/client.ts
export class AuravantClient {
  private baseUrl = process.env.AURAVANT_API_BASE_URL;
  private token: string;
  
  constructor(token: string) {
    this.token = token;
  }
  
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    const data = await response.json();
    
    // Handle Auravant-specific error codes
    if (data.code !== 0) {
      throw new AuravantAPIError(data.code, data.msg);
    }
    
    return data;
  }
  
  // Field management
  async getFields(): Promise<AuravantField[]> {
    return this.request('/fields');
  }
  
  // Labour operations
  async getLabourOperations(params: {
    yeargroup: number;
    page?: number;
    page_size?: number;
  }): Promise<AuravantLabourResponse> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/activities/labour?${query}`);
  }
  
  // Livestock management (unique feature)
  async getHerds(): Promise<AuravantHerd[]> {
    return this.request('/livestock/herd');
  }
  
  // Work orders (unique feature)
  async getWorkOrders(): Promise<AuravantWorkOrder[]> {
    return this.request('/work_orders');
  }
}
```

**Week 4: Specialized Features**
- [ ] Implement livestock management APIs
- [ ] Add work order system integration
- [ ] Create data normalization functions
- [ ] Add comprehensive error handling

### Phase 3: UI Integration (Weeks 5-6)

**Week 5: Platform Selection Enhancement**

**Enhanced Platform Selector:**
```tsx
export function PlatformSelector() {
  const platforms = [
    {
      id: 'johndeere',
      name: 'John Deere Operations Center',
      description: 'Equipment data and field operations',
      features: ['Equipment Management', 'Field Operations', 'Precision Agriculture'],
      regions: ['North America', 'Global']
    },
    {
      id: 'fieldview',
      name: 'Climate FieldView',
      description: 'Field analytics and imagery',
      features: ['Satellite Imagery', 'Field Analytics', 'Soil Sampling'],
      regions: ['North America']
    },
    {
      id: 'auravant',
      name: 'Auravant',
      description: 'Comprehensive farm management with livestock',
      features: ['Livestock Management', 'Work Orders', 'Labour Operations', 'Planning Tools'],
      regions: ['South America', 'Argentina', 'Brazil', 'Paraguay'],
      uniqueFeatures: ['Livestock', 'Work Orders']
    }
  ];
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Agricultural Platforms</h3>
      {platforms.map(platform => (
        <PlatformCard
          key={platform.id}
          platform={platform}
          onConnect={() => handleConnect(platform.id)}
        />
      ))}
    </div>
  );
}
```

**Week 6: Livestock & Work Order UI**
- [ ] Create livestock management components
- [ ] Add work order planning interface
- [ ] Implement data visualization for livestock
- [ ] Add multi-language support (Spanish/Portuguese)

### Phase 4: Unified Data Layer (Weeks 7-8)

**Week 7: Data Normalization Engine**

```typescript
export class DataNormalizer {
  // Normalize field operations across platforms
  static normalizeFieldOperation(
    operation: JohnDeereOperation | FieldViewActivity | AuravantLabour,
    source: 'johndeere' | 'fieldview' | 'auravant'
  ): StandardizedFieldOperation {
    switch (source) {
      case 'auravant':
        const auravantOp = operation as AuravantLabour;
        return {
          id: auravantOp.uuid,
          type: this.mapAuravantLabourType(auravantOp.labour_type_id),
          date: new Date(auravantOp.date),
          fieldId: auravantOp.field_id.toString(),
          area: auravantOp.surface,
          areaUnit: 'hectares',
          crop: auravantOp.rotation?.crop_name,
          status: this.mapAuravantStatus(auravantOp.status),
          dataSource: 'auravant',
          yeargroup: auravantOp.yeargroup,
          // Auravant-specific fields
          workOrderUuid: auravantOp.work_order_uuid,
          herdUuid: auravantOp.herd_uuid,
          paddockId: auravantOp.paddock_id
        };
      // ... other platform normalizations
    }
  }
  
  // Normalize livestock data (Auravant-specific)
  static normalizeLivestockHerd(herd: AuravantHerd): StandardizedHerd {
    return {
      id: herd.herd_uuid,
      name: herd.herd_name,
      animalCount: herd.animal_count,
      weight: herd.weight,
      weightUnit: herd.weight_unit,
      category: this.mapLivestockCategory(herd.type_id),
      location: {
        paddockId: herd.paddock_id,
        fieldId: herd.field_id,
        farmId: herd.farm_id
      },
      dataSource: 'auravant'
    };
  }
}
```

**Week 8: Unified API Interface**
- [ ] Create unified API endpoints
- [ ] Implement cross-platform data queries
- [ ] Add platform-specific feature detection
- [ ] Create data synchronization scheduler

### Phase 5: Testing & Quality Assurance (Weeks 9-10)

**Week 9: Comprehensive Testing**

**Unit Tests:**
```typescript
describe('AuravantClient', () => {
  test('should authenticate with valid token', async () => {
    const client = new AuravantClient('valid-token');
    const fields = await client.getFields();
    expect(fields).toBeDefined();
  });
  
  test('should handle livestock operations', async () => {
    const client = new AuravantClient('valid-token');
    const herds = await client.getHerds();
    expect(herds).toBeInstanceOf(Array);
  });
  
  test('should normalize labour operations correctly', () => {
    const auravantLabour = mockAuravantLabour();
    const normalized = DataNormalizer.normalizeFieldOperation(
      auravantLabour,
      'auravant'
    );
    expect(normalized.dataSource).toBe('auravant');
    expect(normalized.type).toBe('application');
  });
});
```

**Week 10: E2E Testing**
- [ ] Test complete user workflow
- [ ] Test platform switching scenarios
- [ ] Validate livestock management features
- [ ] Test work order planning flow

### Phase 6: Regression Testing (Week 11)

**Automated Regression Tests:**
```bash
# Run comprehensive regression test suite
npm run test:regression:auravant

# Test existing John Deere functionality
npm run test:regression:johndeere

# Test multi-platform scenarios
npm run test:regression:multiplatform
```

**Manual Testing Checklist:**
- [ ] John Deere integration unchanged
- [ ] FieldView integration (if implemented) unchanged
- [ ] Multi-platform data display correct
- [ ] Authentication flows work for all platforms
- [ ] Data source attribution accurate
- [ ] Performance within acceptable limits

### Phase 7: Deployment & Monitoring (Week 12)

**Feature Flag Configuration:**
```typescript
const FEATURE_FLAGS = {
  ENABLE_AURAVANT: process.env.ENABLE_AURAVANT === 'true',
  ENABLE_AURAVANT_LIVESTOCK: process.env.ENABLE_AURAVANT_LIVESTOCK === 'true',
  ENABLE_AURAVANT_WORKORDERS: process.env.ENABLE_AURAVANT_WORKORDERS === 'true',
  AURAVANT_ROLLOUT_PERCENTAGE: parseInt(process.env.AURAVANT_ROLLOUT_PERCENTAGE || '0')
};
```

**Deployment Strategy:**
1. **Internal Testing** (Week 12.1): Deploy to staging with full feature access
2. **Beta Release** (Week 12.2): 10% user rollout with monitoring
3. **Gradual Rollout** (Week 12.3): Increase to 50% based on metrics
4. **Full Release** (Week 12.4): 100% rollout with performance monitoring

## API Routes Structure

### Authentication Routes
```
/api/auth/auravant/
├── connect/           POST - Connect with bearer token
├── disconnect/        POST - Disconnect platform
├── status/           GET  - Connection status
└── refresh/          POST - Refresh token (if needed)
```

### Data Routes
```
/api/auravant/
├── fields/           GET  - List fields
├── farms/            GET  - List farms
├── operations/       GET  - List labour operations
├── livestock/
│   ├── herds/        GET  - List herds
│   ├── paddocks/     GET  - List paddocks
│   └── transactions/ GET  - List livestock transactions
├── workorders/       GET  - List work orders
└── sync/             POST - Trigger data synchronization
```

## Unique Features Implementation

### 1. Livestock Management System

**Components:**
- `LivestockDashboard.tsx` - Overview of all herds
- `HerdDetail.tsx` - Individual herd management
- `PaddockMap.tsx` - Spatial paddock visualization
- `LivestockTransactions.tsx` - Movement and transaction history

**Key Features:**
- Herd tracking with animal counts and weights
- Paddock-based spatial management
- Transaction recording (sales, movements, deaths)
- Integration with field operations for grazing management

### 2. Work Order Planning System

**Components:**
- `WorkOrderPlanner.tsx` - Create and manage work orders
- `RecommendationEngine.tsx` - Display environmental recommendations
- `LabourScheduler.tsx` - Schedule labour operations
- `WorkOrderProgress.tsx` - Track execution progress

**Key Features:**
- Environmental recommendations based on weather and conditions
- Labour operation scheduling and resource allocation
- Progress tracking and completion verification
- PDF/Excel export capabilities

### 3. Multi-Language Support

**Internationalization for South American Market:**
- Spanish (Argentina, Paraguay)
- Portuguese (Brazil)
- English (International)

```typescript
export const auravantTranslations = {
  en: {
    livestock: { herds: 'Herds', paddocks: 'Paddocks' },
    workOrders: { planning: 'Work Order Planning' }
  },
  es: {
    livestock: { herds: 'Rodeos', paddocks: 'Potreros' },
    workOrders: { planning: 'Planificación de Órdenes de Trabajo' }
  },
  pt: {
    livestock: { herds: 'Rebanhos', paddocks: 'Piquetes' },
    workOrders: { planning: 'Planejamento de Ordens de Trabalho' }
  }
};
```

## Data Synchronization Strategy

### Incremental Sync by Yeargroup
```typescript
export class AuravantSyncService {
  async syncByYeargroup(yeargroup: number): Promise<SyncResult> {
    const results = {
      fields: 0,
      operations: 0,
      herds: 0,
      workOrders: 0,
      errors: []
    };
    
    try {
      // Sync fields and farms
      const fields = await this.client.getFields();
      results.fields = await this.storeFields(fields);
      
      // Sync labour operations for yeargroup
      const operations = await this.client.getLabourOperations({ yeargroup });
      results.operations = await this.storeOperations(operations.data);
      
      // Sync livestock data
      if (this.isLivestockEnabled()) {
        const herds = await this.client.getHerds();
        results.herds = await this.storeHerds(herds);
      }
      
      // Sync work orders
      const workOrders = await this.client.getWorkOrders();
      results.workOrders = await this.storeWorkOrders(workOrders);
      
    } catch (error) {
      results.errors.push(error.message);
    }
    
    return results;
  }
}
```

## Success Metrics

### Technical Metrics
- **API Integration**: 100% of documented endpoints implemented
- **Authentication**: 99.9% success rate for token validation
- **Data Synchronization**: < 1% data loss during sync
- **Platform Switching**: < 2 seconds switch time
- **Test Coverage**: > 90% code coverage

### User Experience Metrics
- **Connection Success**: > 95% successful platform connections
- **Feature Adoption**: > 60% users utilize livestock features
- **User Satisfaction**: > 4.5/5 rating for Auravant integration
- **Error Rate**: < 1% user-facing errors

### Business Metrics
- **Market Expansion**: Access to South American agricultural market
- **User Retention**: +15% retention among users with livestock operations
- **Platform Differentiation**: Unique livestock management capabilities
- **Competitive Advantage**: First-to-market with comprehensive livestock integration

## Risk Mitigation & Rollback Plan

### Risk Assessment
1. **High Risk**: Token management complexity and session handling
2. **Medium Risk**: Livestock data model complexity and spatial data handling
3. **Low Risk**: Work order system integration

### Rollback Strategy
```typescript
// Feature flag rollback
const rollbackAuravant = async () => {
  await updateFeatureFlag('ENABLE_AURAVANT', false);
  await updateFeatureFlag('ENABLE_AURAVANT_LIVESTOCK', false);
  await updateFeatureFlag('ENABLE_AURAVANT_WORKORDERS', false);
  
  // Maintain data integrity
  await preserveAuravantData();
  
  // Notify users
  await notifyUsersOfRollback();
};
```

## Future Enhancement Opportunities

### Phase 2 Features (Post-Launch)
1. **Advanced Livestock Analytics**: Breeding optimization, health tracking
2. **Work Order Automation**: AI-powered recommendation engine
3. **Multi-Farm Management**: Enterprise-level farm group management
4. **Mobile Livestock Tracking**: Field-based herd management app
5. **Integration Expansion**: Connect with local South American platforms

### Platform Evolution
1. **API Enhancement**: Real-time data streaming
2. **Offline Capabilities**: Field operation recording without connectivity
3. **Advanced Reporting**: Livestock performance analytics
4. **Compliance Features**: South American regulatory compliance
5. **Marketplace Integration**: Input purchasing and livestock trading

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: February 2025

This comprehensive integration plan provides a roadmap for successfully adding Auravant platform support to the AgMCP application, leveraging its unique livestock management and work order capabilities while maintaining the established multi-platform architecture. 