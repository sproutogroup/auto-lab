// Offline Indicator Component for AUTOLAB Dealership Management System
// Implementing comprehensive offline status UI with snake_case naming conventions

import React, { useState, useEffect } from "react";
import { usePWA } from "./PWAProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  WifiOff,
  Wifi,
  RotateCcw as Sync,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Offline indicator component
export function OfflineIndicator() {
  const {
    is_online,
    show_offline_banner,
    dismiss_offline_banner,
    offline_actions_count,
    sync_offline_actions,
  } = usePWA();

  const [is_syncing, set_is_syncing] = useState(false);
  const [sync_progress, set_sync_progress] = useState(0);
  const [last_sync_time, set_last_sync_time] = useState<Date | null>(null);

  // Handle sync button click
  const handle_sync = async () => {
    if (!is_online) {
      console.log("[PWA] Cannot sync - offline");
      return;
    }

    set_is_syncing(true);
    set_sync_progress(0);

    try {
      // Simulate progress for better UX
      const progress_interval = setInterval(() => {
        set_sync_progress((prev) => {
          if (prev >= 90) {
            clearInterval(progress_interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await sync_offline_actions();

      // Complete progress
      set_sync_progress(100);
      set_last_sync_time(new Date());

      // Clear progress after delay
      setTimeout(() => {
        set_sync_progress(0);
        set_is_syncing(false);
      }, 1000);
    } catch (error) {
      console.error("[PWA] Sync failed:", error);
      set_is_syncing(false);
      set_sync_progress(0);
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (is_online && offline_actions_count > 0) {
      handle_sync();
    }
  }, [is_online]);

  // Offline banner
  if (show_offline_banner && !is_online) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <WifiOff className="h-4 w-4" />
              <div>
                <span className="font-semibold text-sm">You're offline</span>
                {offline_actions_count > 0 && (
                  <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                    {offline_actions_count} actions queued
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss_offline_banner}
              className="text-white hover:bg-white/20 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Network status indicator for header
export function NetworkStatusIndicator() {
  const { is_online, offline_actions_count, sync_offline_actions } = usePWA();

  const [is_syncing, set_is_syncing] = useState(false);

  // Handle sync click
  const handle_sync = async () => {
    if (!is_online || offline_actions_count === 0) return;

    set_is_syncing(true);
    try {
      await sync_offline_actions();
    } finally {
      set_is_syncing(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Network status */}
      <div className="flex items-center space-x-1">
        {is_online ? (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-600 hidden sm:inline">
              Online
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-600" />
            <span className="text-xs text-red-600 hidden sm:inline">
              Offline
            </span>
          </>
        )}
      </div>

      {/* Offline actions indicator */}
      {offline_actions_count > 0 && (
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handle_sync}
            disabled={!is_online || is_syncing}
            className="h-6 px-2 text-xs"
          >
            {is_syncing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                Syncing
              </>
            ) : (
              <>
                <Sync className="h-3 w-3 mr-1" />
                {offline_actions_count}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Detailed offline status component
export function OfflineStatusCard() {
  const { is_online, offline_actions_count, sync_offline_actions } = usePWA();

  const [is_syncing, set_is_syncing] = useState(false);
  const [sync_progress, set_sync_progress] = useState(0);
  const [last_sync_time, set_last_sync_time] = useState<Date | null>(null);

  // Handle sync
  const handle_sync = async () => {
    if (!is_online) return;

    set_is_syncing(true);
    set_sync_progress(0);

    try {
      const progress_interval = setInterval(() => {
        set_sync_progress((prev) => {
          if (prev >= 90) {
            clearInterval(progress_interval);
            return prev;
          }
          return prev + 15;
        });
      }, 300);

      await sync_offline_actions();

      set_sync_progress(100);
      set_last_sync_time(new Date());

      setTimeout(() => {
        set_sync_progress(0);
        set_is_syncing(false);
      }, 1000);
    } catch (error) {
      console.error("[PWA] Sync failed:", error);
      set_is_syncing(false);
      set_sync_progress(0);
    }
  };

  // Format last sync time
  const format_last_sync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Status header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {is_online ? (
                <div className="flex items-center space-x-2">
                  <Wifi className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-600">Online</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-600">Offline</span>
                </div>
              )}
            </div>

            <Badge variant={is_online ? "default" : "destructive"}>
              {is_online ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          {/* Offline actions */}
          {offline_actions_count > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Queued actions</span>
                <Badge variant="outline">{offline_actions_count}</Badge>
              </div>

              {is_syncing && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Syncing...</span>
                    <span>{sync_progress}%</span>
                  </div>
                  <Progress value={sync_progress} className="h-2" />
                </div>
              )}

              <Button
                onClick={handle_sync}
                disabled={!is_online || is_syncing}
                size="sm"
                className="w-full"
              >
                {is_syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Syncing {offline_actions_count} actions
                  </>
                ) : (
                  <>
                    <Sync className="h-4 w-4 mr-2" />
                    Sync {offline_actions_count} actions
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Last sync time */}
          {last_sync_time && (
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>Last sync: {format_last_sync(last_sync_time)}</span>
            </div>
          )}

          {/* Status message */}
          <div className="text-xs text-gray-500">
            {is_online ? (
              offline_actions_count > 0 ? (
                <span>Your changes will be synced automatically</span>
              ) : (
                <span>All changes are up to date</span>
              )
            ) : (
              <span>
                Your changes will be saved and synced when you're back online
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
