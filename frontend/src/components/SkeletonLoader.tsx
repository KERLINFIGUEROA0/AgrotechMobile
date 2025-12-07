import { motion } from 'framer-motion';
import { Card, CardBody } from '@heroui/react';

interface SkeletonLoaderProps {
  type: 'card' | 'table' | 'form';
  count?: number;
}

const SkeletonItem = ({ className }: { className: string }) => (
  <motion.div
    className={`bg-gray-200 rounded-md ${className}`}
    animate={{
      opacity: [0.5, 1, 0.5],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
);

export default function SkeletonLoader({ type, count = 1 }: SkeletonLoaderProps) {
  if (type === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="w-full border border-gray-100 bg-white">
              {/* Image skeleton */}
              <div className="h-32 sm:h-40 w-full bg-gray-100 rounded-t-lg overflow-hidden">
                <SkeletonItem className="h-full w-full" />
              </div>

              {/* Content skeleton */}
              <CardBody className="px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between h-full">
                  <div className="flex flex-col space-y-2">
                    <SkeletonItem className="h-4 w-16" />
                    <SkeletonItem className="h-6 w-12" />
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <SkeletonItem className="h-4 w-12" />
                    <SkeletonItem className="h-5 w-8" />
                  </div>
                </div>
              </CardBody>

              {/* Footer skeleton */}
              <div className="p-2 sm:p-3 border-t border-gray-100">
                <div className="flex gap-2 mb-2">
                  <SkeletonItem className="h-8 flex-1 rounded-md" />
                  <SkeletonItem className="h-8 flex-1 rounded-md" />
                </div>
                <div className="flex items-center justify-center gap-1">
                  <SkeletonItem className="h-8 w-8 rounded-md" />
                  <SkeletonItem className="h-8 w-8 rounded-md" />
                  <SkeletonItem className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <motion.div
            key={index}
            className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-100"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <SkeletonItem className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonItem className="h-4 w-3/4" />
              <SkeletonItem className="h-3 w-1/2" />
            </div>
            <SkeletonItem className="h-6 w-16" />
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <motion.div
            key={index}
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <SkeletonItem className="h-4 w-20" />
            <SkeletonItem className="h-10 w-full rounded-md" />
          </motion.div>
        ))}
      </div>
    );
  }

  return null;
}