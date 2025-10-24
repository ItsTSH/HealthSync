export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="flex w-full max-w-5xl rounded-xl overflow-hidden shadow-lg bg-white">
        {/* Left Panel */}
        <div className="w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white flex flex-col justify-center items-center p-10">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-4">Welcome Back, Doctor</h1>
            <p className="text-lg mb-6">
              Access your AI-powered medical suite dashboard to streamline patient documentation and focus on what matters most – patient care.
            </p>
            <ul className="space-y-3 text-white/90 text-left text-base font-medium">
              <li className="flex items-start">
                <span className="mr-2 text-xl">•</span> AI-powered transcription
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-xl">•</span> HIPAA-compliant
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-xl">•</span> Time-saving automation
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-xl">•</span> Seamless EHR integration
              </li>
            </ul>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-1/2 bg-white flex flex-col justify-center items-center p-10">
          {children}
        </div>
      </div>
    </div>
  );
}