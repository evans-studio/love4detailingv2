'use client'

/**
 * Customer Support Page - Help and Contact
 * Part of systematic customer dashboard with sidebar navigation
 */

import EnhancedCustomerDashboardLayout from "@/components/dashboard/EnhancedCustomerDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpCircle, Phone, Mail, MessageSquare, Book, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function SupportPage() {
  return (
    <EnhancedCustomerDashboardLayout title="Support" subtitle="Get help and contact our support team">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Support</h1>
            <p className="text-muted-foreground">
              Get help and contact our support team
            </p>
          </div>
        </div>

        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Call Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Speak directly with our support team
              </p>
              <div className="space-y-2">
                <p className="font-medium">+44 20 1234 5678</p>
                <p className="text-sm text-muted-foreground">Mon-Fri 9AM-6PM</p>
              </div>
              <Button className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send us an email and we'll respond within 24 hours
              </p>
              <div className="space-y-2">
                <p className="font-medium">support@love4detailing.com</p>
                <p className="text-sm text-muted-foreground">Response within 24h</p>
              </div>
              <Button className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Live Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Chat with our team in real-time
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Online</span>
                </div>
                <p className="text-sm text-muted-foreground">Average response: 2 min</p>
              </div>
              <Button className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start Chat
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">How do I reschedule my booking?</h4>
                <p className="text-sm text-muted-foreground">
                  You can reschedule your booking up to 24 hours before the appointment in your bookings dashboard.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">What if I need to cancel?</h4>
                <p className="text-sm text-muted-foreground">
                  Cancellations are free up to 24 hours before your appointment. Later cancellations may incur a fee.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">How is my vehicle size determined?</h4>
                <p className="text-sm text-muted-foreground">
                  Vehicle size is automatically detected from your registration and affects service pricing.
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              View All FAQs
            </Button>
          </CardContent>
        </Card>

        {/* Coming Soon Notice */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Enhanced Support - Coming Soon</h3>
                <p className="text-sm text-green-700">
                  Advanced help center with video tutorials and self-service options
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </EnhancedCustomerDashboardLayout>
  )
}