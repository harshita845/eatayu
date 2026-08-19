import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Star, Clock } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { Card, CardContent } from "@food/components/ui/card"
import { restaurantAPI } from "@food/api"
import useAppBackNavigation from "@food/hooks/useAppBackNavigation"
import { toast } from "sonner"
import { RestaurantGridSkeleton } from "@food/components/ui/loading-skeletons"
import { useDelayedLoading } from "@food/hooks/useDelayedLoading"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function Offers() {
  const navigate = useNavigate()
  const goBack = useAppBackNavigation()
  const [offers, setOffers] = useState([])
  const [groupedOffers, setGroupedOffers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const showOffersSkeleton = useDelayedLoading(loading)

  // Fetch offers from API
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await restaurantAPI.getPublicOffers()
        const data = response?.data?.data
        
        if (data) {
          setOffers(data.allOffers || [])
          setGroupedOffers(data.groupedByOffer || {})
        }
      } catch (err) {
        debugError('Error fetching offers:', err)
        debugError('Error details:', err?.response?.data || err?.message)
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load offers'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchOffers()
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div 
        className="relative w-full overflow-hidden min-h-[25vh] md:min-h-[30vh] flex flex-col justify-center items-center px-4 py-8 shadow-sm"
        style={{ 
          backgroundColor: '#EB590E', 
          backgroundImage: 'linear-gradient(to right, #EB590E, #ff7d3b)' 
        }}
      >
        {/* Back Button */}
        <button 
          onClick={goBack}
          className="absolute top-4 left-4 md:top-6 md:left-6 z-20 w-10 h-10 md:w-12 md:h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </button>
        
        {/* Decorative Grid Patterns / Circles for Premium Feel */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-72 h-72 rounded-full bg-white blur-2xl"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 rounded-full bg-white blur-xl"></div>
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#fff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Text and Icon Content */}
        <div className="relative z-10 text-center flex flex-col items-center select-none">
          <span className="text-white/80 font-black tracking-widest text-[13px] md:text-sm uppercase mb-1 drop-shadow-sm">
            FLASH
          </span>
          <h1 className="text-white font-extrabold text-4xl md:text-5xl lg:text-6xl tracking-tight leading-none drop-shadow-md">
            OFFERS
          </h1>
          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-white/25 backdrop-blur-md rounded-full text-white text-[11px] md:text-xs font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            Super Discounts inside
          </div>
        </div>

        {/* Bottom Wavy/Stamp Edge Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-3 flex overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 min-w-[12px] h-3 bg-white dark:bg-[#0a0a0a] rounded-t-full"
              style={{ transform: 'translateY(6px)' }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-8 lg:py-10 space-y-6 md:space-y-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Loading State */}
        {showOffersSkeleton && <RestaurantGridSkeleton count={4} compact />}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-500 dark:text-red-400 text-center">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
          </div>
        )}

        {/* Offers Sections */}
        {!showOffersSkeleton && !error && (
          <>
            {/* Grouped Offers Sections */}
            {Object.keys(groupedOffers).length > 0 && Object.entries(groupedOffers).map(([offerText, dishes]) => (
              <section key={offerText}>
                <h2 
                  className="text-2xl sm:text-3xl font-black text-center mb-4 tracking-wide"
                  style={{ color: '#EB590E' }}
                >
                  {offerText}
                </h2>
                
                {/* Restaurant Cards - Grid Layout */}
                <div 
                  className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 lg:gap-6"
                >
                  {dishes.slice(0, 8).map((dish) => (
                    <Link 
                      key={dish.id} 
                      to={`/user/restaurants/${dish.restaurantSlug}`}
                      className="w-full"
                    >
                      <div className="group">
                        {/* Image Container */}
                        <div className="relative h-32 sm:h-36 rounded-xl overflow-hidden mb-2">
                          <img 
                            src={dish.dishImage || dish.restaurantImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"} 
                            alt={dish.dishName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Offer Badge */}
                          <div className="absolute top-2 left-2 bg-[#EB590E] text-white text-[10px] sm:text-xs font-semibold px-2 py-1 rounded">
                            {dish.offer}
                          </div>
                        </div>
                        
                        {/* Rating Badge */}
                        <div className="flex items-center gap-1 mb-1">
                          <div className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            {dish.restaurantRating?.toFixed(1) || '0.0'}
                            <Star className="h-2.5 w-2.5 fill-white" />
                          </div>
                        </div>
                        
                        {/* Restaurant Info */}
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1">
                          {dish.restaurantName}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mb-1">
                          {dish.dishName} - ₹{dish.discountedPrice}
                        </p>
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>{dish.deliveryTime}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}

            {/* Coupon-style offers (admin created) */}
            {Object.keys(groupedOffers).length === 0 && offers.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Available Coupons
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offers.map((o) => (
                    <Card key={o.id || o.offerId} className="border border-slate-200 shadow-sm">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Coupon</p>
                            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-wide">
                              {o.couponCode || "-"}
                            </p>
                          </div>
                          <span 
                            className="px-2 py-1 rounded-md text-xs font-semibold text-white"
                            style={{ backgroundColor: '#EB590E' }}
                          >
                            {o.title || "Offer"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">Restaurant:</span>{" "}
                          {o.restaurantName || "All Restaurants"}
                        </p>
                        {o.endDate && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Valid till: {new Date(o.endDate).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {offers.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No offers available at the moment</p>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}

