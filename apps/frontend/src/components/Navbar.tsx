import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu,
  X,
  Box,
  Sparkles,
  User,
  LogOut,
  Settings,
  Printer,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RealTimeStatus } from "@/components/RealTimeStatus";
import { UserRole } from "@/types/api";
import { toast } from "sonner";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Makers", href: "/makers", protected: true },
    { name: "Orders", href: "/orders", protected: true },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const isActive = (href: string) => {
    if (href === "/" && location.pathname === "/") return true;
    if (href !== "/" && location.pathname.startsWith(href)) return true;
    return false;
  };

  // Hide navbar on PrintStudio page
  if (location.pathname === "/studio") {
    return null;
  }

  return (
    <nav className="bg-background/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-200">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-text-primary">
                Swift Prints
              </span>
              <span className="text-xs text-text-muted -mt-1">
                3D Printing Made Easy
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              // Hide protected routes if not authenticated
              if (item.protected && !isAuthenticated) return null;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-all duration-200 relative ${
                    isActive(item.href)
                      ? "text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {item.name}
                  {isActive(item.href) && (
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && <RealTimeStatus />}
            {!isAuthenticated ? (
              <>
                <Badge
                  variant="outline"
                  className="text-xs bg-primary/5 text-primary border-primary/20"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  New Features
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-secondary hover:text-text-primary"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => navigate("/signup")}
                >
                  Get Started
                </Button>
              </>
            ) : (
              <>
                <Badge
                  variant="outline"
                  className="text-xs bg-green-50 text-green-600 border-green-200"
                >
                  {user?.role}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user?.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user?.email}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user?.role} account
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    {user?.role === UserRole.MAKER && (
                      <DropdownMenuItem
                        onClick={() => navigate("/maker/dashboard")}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Maker Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2"
            >
              {isOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-border/50 bg-background/95 backdrop-blur-md">
              {navigation.map((item) => {
                // Hide protected routes if not authenticated
                if (item.protected && !isAuthenticated) return null;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-3 py-3 text-base font-medium rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? "text-primary bg-primary/5 border border-primary/20"
                        : "text-text-secondary hover:text-text-primary hover:bg-neutral-50"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-4 space-y-3 border-t border-border/50 mt-4">
                {!isAuthenticated ? (
                  <>
                    <div className="flex justify-center">
                      <Badge
                        variant="outline"
                        className="text-xs bg-primary/5 text-primary border-primary/20"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        New Features
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          navigate("/login");
                          setIsOpen(false);
                        }}
                      >
                        Sign In
                      </Button>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                        onClick={() => {
                          navigate("/signup");
                          setIsOpen(false);
                        }}
                      >
                        Get Started
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-3 px-3 py-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user?.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">{user?.email}</p>
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-600 border-green-200 w-fit"
                        >
                          {user?.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          navigate("/profile");
                          setIsOpen(false);
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Button>
                      {user?.role === UserRole.MAKER && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate("/maker/dashboard");
                            setIsOpen(false);
                          }}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Maker Dashboard
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          navigate("/settings");
                          setIsOpen(false);
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={() => {
                          handleSignOut();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export { Navbar };
