/**
 * Professional Loading Skeleton Components
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border rounded-lg">
          <div className="h-4 w-1/4 skeleton rounded" />
          <div className="h-4 w-1/4 skeleton rounded" />
          <div className="h-4 w-1/4 skeleton rounded" />
          <div className="h-4 w-1/4 skeleton rounded" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 w-1/2 skeleton rounded mb-2" />
            <div className="h-3 w-3/4 skeleton rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-full skeleton rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-1/3 skeleton rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full skeleton rounded" />
      </CardContent>
    </Card>
  );
}
