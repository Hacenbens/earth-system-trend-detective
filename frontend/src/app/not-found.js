import { LandingPage } from '@/app/pages/landing/LandingPage';

// Unknown URLs fall back to the landing page, like the original client router.
export default function NotFound() {
  return <LandingPage />;
}
