/**
 * Maker Card Skeleton
 * Loading placeholder for maker cards
 */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MakerCardSkeleton() {
  return (
    <Card className="border border-border">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4 mb-4">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="w-4 h-4 rounded-full" />
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <div className="mb-4">
          <Skeleton className="h-4 w-16 mb-2" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-6 w-12 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
        </div>

        <div className="mb-4">
          <Skeleton className="h-20 w-full rounded-lg mb-3" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>

        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export function MakerCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <MakerCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default MakerCardSkeleton;
