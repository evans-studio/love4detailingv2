'use client'

import { Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Service, calculateServicePrice } from '@/lib/config/services'

interface ServiceCardProps {
  service: Service
  vehicleSize: string
  selected?: boolean
  onSelect?: (serviceId: string) => void
  className?: string
}

export function ServiceCard({ 
  service, 
  vehicleSize, 
  selected = false, 
  onSelect,
  className 
}: ServiceCardProps) {
  const price = calculateServicePrice(service.id, vehicleSize)
  
  return (
    <Card 
      className={cn(
        "bg-[#1E1E1E] border-gray-800 p-6 cursor-pointer transition-all duration-200",
        selected && "border-[#9146FF] bg-[#9146FF]/5 ring-1 ring-[#9146FF]/20",
        "hover:border-[#9146FF]/50 hover:bg-[#9146FF]/5",
        !service.available && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={() => service.available && onSelect?.(service.id)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-[#F2F2F2] mb-1">
            {service.name}
          </h3>
          <p className="text-sm text-[#C7C7C7]">{service.duration}</p>
        </div>
        <div className="text-right ml-4">
          <div className="text-2xl font-bold text-[#9146FF]">
            £{price}
          </div>
          {!service.available && (
            <div className="text-xs text-red-400 mt-1">
              Unavailable
            </div>
          )}
        </div>
      </div>
      
      <p className="text-[#C7C7C7] mb-4 text-sm leading-relaxed">
        {service.description}
      </p>
      
      <div className="space-y-2">
        {service.features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[#28C76F] mt-0.5 flex-shrink-0" />
            <span className="text-sm text-[#C7C7C7]">{feature}</span>
          </div>
        ))}
      </div>
      
      {selected && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-center gap-2 text-[#9146FF] font-medium">
            <Check className="w-4 h-4" />
            <span className="text-sm">Selected</span>
          </div>
        </div>
      )}
    </Card>
  )
}