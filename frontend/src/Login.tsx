function Login() {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000";

  function handleGoogleLogin() {
    window.location.href =
      `${API_BASE_URL}/auth/google`;
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">

          {/* LOGO */}

          <div className="flex justify-center mb-6">

            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center">

              <span className="text-white text-xl font-bold">
                R
              </span>

            </div>

          </div>


          {/* TITLE */}

          <div className="text-center mb-8">

            <h1 className="text-2xl font-semibold">
              Welcome to ReachInbox
            </h1>

            <p className="text-gray-500 mt-2">
              Sign in to manage your email campaigns
            </p>

          </div>


          {/* GOOGLE LOGIN */}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 font-medium hover:bg-gray-50 transition"
          >

            {/* Google icon */}

            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M21.35 12.23c0-.79-.07-1.55-.23-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.93-4.18 2.93-7.39z"
              />

              <path
                fill="#34A853"
                d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.43c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.29v2.5A9.74 9.74 0 0 0 12 21.5z"
              />

              <path
                fill="#FBBC05"
                d="M6.54 13.62A5.86 5.86 0 0 1 6.23 12c0-.56.1-1.1.31-1.62v-2.5H3.29A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.38l3.25-2.76z"
              />

              <path
                fill="#EA4335"
                d="M12 6.35c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.39 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.71 5.38l3.25 2.5C7.31 8.07 9.46 6.35 12 6.35z"
              />
            </svg>

            Continue with Google

          </button>


          <p className="text-xs text-gray-400 text-center mt-6">
            By continuing, you agree to use ReachInbox
            responsibly.
          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;