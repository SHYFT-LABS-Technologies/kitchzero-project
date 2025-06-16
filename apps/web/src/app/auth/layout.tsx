import { Leaf } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-secondary-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="flex items-center mb-8">
            <Leaf className="h-12 w-12 mr-3" />
            <h1 className="text-4xl font-bold">KitchZero</h1>
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-semibold mb-4">
              Reduce Food Waste, Maximize Sustainability
            </h2>
            <p className="text-lg opacity-90">
              Intelligent inventory management and waste tracking for the modern foodservice industry.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold">50%</div>
              <div className="text-sm opacity-75">Waste Reduction</div>
            </div>
            <div>
              <div className="text-3xl font-bold">30%</div>
              <div className="text-sm opacity-75">Cost Savings</div>
            </div>
            <div>
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm opacity-75">Monitoring</div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-white bg-opacity-10 rounded-full"></div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-background">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Leaf className="h-8 w-8 text-primary-500 mr-2" />
              <h1 className="text-2xl font-bold text-primary-500">KitchZero</h1>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}