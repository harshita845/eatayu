# EatAyu Performance Baseline

Date: 2026-09-10
Environment: Mac / Local Dev Build (`npm run build` in Frontend)

## 1. Frontend Build Statistics (Initial Baseline)

- **Total Build Time**: ~9.78s
- **Largest Vendor Chunk (`vendor-core`)**: **1,091.64 kB** (gzip: 352.86 kB) ⚠️ *Exceeds 1MB warning threshold*
- **PDF Export Chunk (`vendor-export-pdf`)**: **369.04 kB** (gzip: 119.67 kB)
- **MUI & Emotion (`vendor-mui`)**: **323.47 kB** (gzip: 100.18 kB)
- **Firebase SDK (`vendor-firebase`)**: **311.47 kB** (gzip: 91.36 kB)
- **Recharts Chunk (`vendor-charts`)**: **263.34 kB** (gzip: 69.27 kB)
- **HTML2Canvas Chunk (`vendor-export-canvas`)**: **201.04 kB** (gzip: 47.43 kB)
- **Root Entry Bundle (`index.js`)**: **180.60 kB** (gzip: 41.28 kB)
- **Google Maps / API (`vendor-maps`)**: **158.47 kB** (gzip: 34.07 kB)
- **Framer Motion & GSAP (`vendor-motion`)**: **140.97 kB** (gzip: 50.84 kB)

### Key Page Chunk Sizes:
- `DeliveryHomeV2`: **148.53 kB** (gzip: 36.43 kB)
- `Home`: **102.32 kB** (gzip: 27.23 kB)
- `RestaurantDetails`: **100.71 kB** (gzip: 23.30 kB)
- `Cart`: **98.98 kB** (gzip: 25.37 kB)
- `UserRouter`: **94.14 kB** (gzip: 26.67 kB)

---

## 2. Initial Audit Bottlenecks Identified

1. **Monolithic `vendor-core` bundle**: `vendor-core` at 1.09 MB contains Lucide icons, Tailwind utilities, Axios, Radix UI, DayJS, and utility libraries all merged into one single blocking file.
2. **Missing Backend Compression**: Express backend responses are uncompressed JSON.
3. **Static Upload Caching**: `/uploads` served without HTTP cache headers.
4. **Waterfall HTTP Requests on Home load**: Up to 7 public configuration calls on startup.
5. **MongoDB Missing Compound Indexes**: `FoodRestaurant` and `FoodItem` queries scan unindexed fields during list and recommended item queries.
