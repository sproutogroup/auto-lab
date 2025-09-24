// Install Prompt Component for AUTOLAB Dealership Management System
// Implementing comprehensive PWA installation UI with snake_case naming conventions

import React, { useState, useEffect } from "react";
import { usePWA } from "./PWAProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Smartphone, Download, X, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Install prompt component
export function InstallPrompt() {
  const {
    is_installable,
    is_installed,
    install_app,
    show_install_banner,
    dismiss_install_banner,
    is_online,
  } = usePWA();

  const [is_installing, set_is_installing] = useState(false);
  const [show_full_prompt, set_show_full_prompt] = useState(false);

  // Don't show if already installed or not installable
  if (is_installed || !is_installable) {
    return null;
  }

  // Handle install button click
  const handle_install = async () => {
    set_is_installing(true);

    try {
      const success = await install_app();
      if (success) {
        console.log("[PWA] Installation successful");
      }
    } catch (error) {
      console.error("[PWA] Installation failed:", error);
    } finally {
      set_is_installing(false);
    }
  };

  // Handle dismiss
  const handle_dismiss = () => {
    dismiss_install_banner();
    set_show_full_prompt(false);
  };

  // Show full install prompt
  const show_install_details = () => {
    set_show_full_prompt(true);
  };

  // Install banner (minimal)
  if (show_install_banner && !show_full_prompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
        <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg border-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Install AUTOLAB</p>
                  <p className="text-xs text-white/80">
                    Get the app experience
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={show_install_details}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handle_dismiss}
                  className="text-white hover:bg-white/20 p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full install prompt
  if (show_full_prompt) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md bg-white">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">
              Install AUTOLAB
            </CardTitle>
            <CardDescription className="text-gray-600">
              Get the full app experience with offline access and faster
              performance
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Features list */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  Works offline - access your data anytime
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  Faster loading with cached resources
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  Native app experience on your device
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  Quick access from home screen
                </span>
              </div>
            </div>

            {/* Network status */}
            <div className="flex items-center justify-center space-x-2 py-2">
              {is_online ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">Offline</span>
                </>
              )}
            </div>

            {/* Install button */}
            <div className="flex space-x-3">
              <Button
                onClick={handle_install}
                disabled={is_installing}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
              >
                {is_installing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Install App
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handle_dismiss}
                className="px-4"
              >
                Cancel
              </Button>
            </div>

            {/* Installation instructions */}
            <div className="text-xs text-gray-500 text-center">
              <p>The app will be installed on your device.</p>
              <p>You can uninstall it anytime from your device settings.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// Install button for header/toolbar
export function InstallButton() {
  const { is_installable, is_installed, install_app, is_online } = usePWA();

  const [is_installing, set_is_installing] = useState(false);

  // Show install button for testing - temporarily bypass installable check
  // In production, this should check: if (is_installed || !is_installable) return null;
  if (is_installed) {
    return null;
  }

  // Handle install button click
  const handle_install = async () => {
    set_is_installing(true);

    try {
      const success = await install_app();
      if (success) {
        console.log("[PWA] Installation successful");
      }
    } catch (error) {
      console.error("[PWA] Installation failed:", error);
    } finally {
      set_is_installing(false);
    }
  };

  return (
    <Button
      onClick={handle_install}
      disabled={is_installing}
      size="sm"
      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
    >
      {is_installing ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
          Installing
        </>
      ) : (
        <>
          <Download className="h-3 w-3 mr-2" />
          Install
        </>
      )}
    </Button>
  );
}

// Install button for dropdown menu
export function InstallMenuButton() {
  const { is_installable, is_installed, install_app, is_online } = usePWA();

  const [is_installing, set_is_installing] = useState(false);

  // Show install button for testing - temporarily bypass installable check
  // In production, this should check: if (is_installed || !is_installable) return null;
  if (is_installed) {
    return null;
  }

  // Handle install button click
  const handle_install = async () => {
    set_is_installing(true);

    try {
      const success = await install_app();
      if (success) {
        console.log("[PWA] Installation successful");
      }
    } catch (error) {
      console.error("[PWA] Installation failed:", error);
    } finally {
      set_is_installing(false);
    }
  };

  return (
    <DropdownMenuItem onClick={handle_install} disabled={is_installing}>
      {is_installing ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
          Installing...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Install App
        </>
      )}
    </DropdownMenuItem>
  );
}
