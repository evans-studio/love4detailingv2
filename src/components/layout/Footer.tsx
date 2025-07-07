import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants/routes';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 bg-[#141414]">
      <div className="container py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#F2F2F2]">Love4Detailing</h3>
            <p className="text-sm text-[#C7C7C7]">
              Professional car detailing services in London. Transform your vehicle with our expert care.
            </p>
            <div className="flex space-x-4">
              <Link href={ROUTES.BOOK}>
                <Button>Book Service</Button>
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F2F2F2]">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href={ROUTES.BOOK} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">
                  Book Service
                </Link>
              </li>
              <li>
                <Link href={ROUTES.DASHBOARD} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">
                  Customer Dashboard
                </Link>
              </li>
              <li>
                <Link href={ROUTES.SIGN_IN} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F2F2F2]">Contact Us</h4>
            <ul className="space-y-2">
              <li className="text-sm text-[#C7C7C7]">
                123 Detail Street
                <br />
                London, SW1A 1AA
              </li>
              <li>
                <a href="tel:+442012345678" className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">
                  020 1234 5678
                </a>
              </li>
              <li>
                <a href="mailto:info@love4detailing.com" className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">
                  info@love4detailing.com
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F2F2F2]">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href={ROUTES.DASHBOARD_PROFILE} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">
                  My Account
                </Link>
              </li>
              <li>
                <Link href={ROUTES.DASHBOARD_BOOKINGS} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link href={ROUTES.DASHBOARD_REWARDS} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">
                  Loyalty Points
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-[#C7C7C7]">
              © {new Date().getFullYear()} Love4Detailing. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 