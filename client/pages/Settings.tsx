import { ArrowLeft, User, Bell, Palette, Mic, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function Settings() {
  const settingsGroups = [
    {
      title: "Account",
      icon: User,
      items: [
        { label: "Profile", description: "Manage your profile information" },
        { label: "Preferences", description: "Customize your experience" },
      ],
    },
    {
      title: "Voice Assistant",
      icon: Mic,
      items: [
        { label: "Voice Commands", description: "Configure voice recognition" },
        { label: "Language", description: "Set your preferred language" },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        {
          label: "Push Notifications",
          description: "Manage notification settings",
        },
        { label: "Email Alerts", description: "Configure email preferences" },
      ],
    },
    {
      title: "Appearance",
      icon: Palette,
      items: [
        { label: "Theme", description: "Light, dark, or system preference" },
        { label: "Glassmorphism", description: "Adjust transparency effects" },
      ],
    },
    {
      title: "Privacy & Security",
      icon: Shield,
      items: [
        { label: "Data Privacy", description: "Control your data sharing" },
        { label: "Security", description: "Manage security settings" },
      ],
    },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="relative z-30 pt-8 pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <Link
              to="/"
              className="w-10 h-10 rounded-full glass hover:glass-strong flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">
                Customize your voice assistant experience
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Content */}
      <main className="px-6 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          {settingsGroups.map((group, groupIndex) => {
            const Icon = group.icon;
            return (
              <div key={groupIndex} className="glass rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {group.title}
                  </h2>
                </div>

                <div className="space-y-3">
                  {group.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div>
                        <h3 className="font-medium text-foreground">
                          {item.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Coming Soon Notice */}
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Settings Coming Soon
            </h3>
            <p className="text-muted-foreground">
              We're working on making these settings fully functional. Stay
              tuned for updates!
            </p>
          </div>
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>
    </div>
  );
}
