'use client';

import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib';

import { Button } from './Button';

type CTAAnimation = {
  type?: 'slide';
  delay?: number;
};

const ctaActionVariants = cva(
  'h-12 w-full rounded-xl border text-base font-semibold transition duration-150 ease-out disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        filled: '',
        subtle: '',
      },
      color: {
        confirm: '',
        cancel: '',
        danger: '',
      },
    },
    compoundVariants: [
      {
        variant: 'filled',
        color: 'confirm',
        className:
          'border-emerald-600 bg-emerald-600 text-white hover:border-emerald-500 hover:bg-emerald-500 active:border-emerald-700 active:bg-emerald-700',
      },
      {
        variant: 'filled',
        color: 'cancel',
        className: 'border-gray-600 bg-gray-600 text-white hover:bg-gray-500 active:bg-gray-600',
      },
      {
        variant: 'filled',
        color: 'danger',
        className: 'border-red-600 bg-red-600 text-white hover:bg-red-500 active:bg-red-600',
      },
      {
        variant: 'subtle',
        color: 'confirm',
        className:
          'border-emerald-50 bg-emerald-50 text-emerald-700 hover:border-emerald-100 hover:bg-emerald-100 active:border-emerald-200 active:bg-emerald-200',
      },
      {
        variant: 'subtle',
        color: 'cancel',
        className:
          'border-gray-100 bg-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-200 active:border-gray-300 active:bg-gray-300',
      },
      {
        variant: 'subtle',
        color: 'danger',
        className:
          'border-red-50 bg-red-50 text-red-700 hover:border-red-100 hover:bg-red-100 active:border-red-200 active:bg-red-200',
      },
    ],
    defaultVariants: {
      variant: 'filled',
      color: 'confirm',
    },
  },
);

interface CTAFrameProps {
  /** CTA 표시 여부를 제어합니다. false면 슬라이드 아웃된 상태로 숨깁니다. */
  open?: boolean;
  /** 스크롤 방향에 따라 CTA를 자동으로 숨기거나 다시 노출합니다. */
  hideOnScroll?: boolean;
  /** CTA 등장/퇴장 애니메이션 타입과 지연 시간을 설정합니다. */
  animation?: CTAAnimation;
}

interface CallToActionProps
  extends
    Omit<React.ComponentProps<typeof Button>, 'variant' | 'color' | 'size'>,
    VariantProps<typeof ctaActionVariants> {}

interface CTAButtonProps extends CTAFrameProps, CallToActionProps {
  containerClassName?: string;
}

interface CTAConfirmButtonRootProps extends CTAFrameProps, React.ComponentProps<'div'> {
  containerClassName?: string;
}

/**
 * @description CTA 노출 상태(open/hideOnScroll)를 계산합니다.
 */
function useCTAVisibility({ open = true, hideOnScroll = false }: CTAFrameProps) {
  const [isVisibleByScroll, setIsVisibleByScroll] = React.useState(true);

  React.useEffect(
    function syncVisibilityWithOpenAndMode() {
      if (!open) {
        setIsVisibleByScroll(false);
        return;
      }

      if (!hideOnScroll) {
        setIsVisibleByScroll(true);
      }
    },
    [open, hideOnScroll],
  );

  React.useEffect(
    function registerScrollVisibilityHandler() {
      if (!open || !hideOnScroll) return;

      const threshold = 8;
      let previousScrollY = 0;

      function resolveCurrentScrollTop(target?: EventTarget | null) {
        if (target instanceof HTMLElement) {
          return target.scrollTop;
        }

        if (target instanceof Document) {
          return target.documentElement.scrollTop || target.body.scrollTop || 0;
        }

        return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      }

      function updateVisibilityByScrollDirection(currentScrollY: number) {
        const delta = currentScrollY - previousScrollY;

        if (currentScrollY <= threshold) {
          setIsVisibleByScroll(true);
          previousScrollY = currentScrollY;
          return;
        }

        if (delta > threshold) {
          setIsVisibleByScroll(false);
        } else if (delta < -threshold) {
          setIsVisibleByScroll(true);
        }

        previousScrollY = currentScrollY;
      }

      function handleWindowScroll() {
        updateVisibilityByScrollDirection(resolveCurrentScrollTop(window));
      }

      function handleDocumentScroll(event: Event) {
        updateVisibilityByScrollDirection(resolveCurrentScrollTop(event.target));
      }

      previousScrollY = resolveCurrentScrollTop(document);
      window.addEventListener('scroll', handleWindowScroll, { passive: true });
      document.addEventListener('scroll', handleDocumentScroll, {
        passive: true,
        capture: true,
      });

      return function cleanupScrollVisibilityHandler() {
        window.removeEventListener('scroll', handleWindowScroll);
        document.removeEventListener('scroll', handleDocumentScroll, {
          capture: true,
        });
      };
    },
    [open, hideOnScroll],
  );

  return open && isVisibleByScroll;
}

/**
 * @description CTA 애니메이션 inline style을 계산합니다.
 */
function resolveCTAAnimationStyle(animation?: CTAAnimation): React.CSSProperties | undefined {
  const delay = animation?.delay ?? 0;
  if (delay <= 0) return undefined;

  return {
    transitionDelay: `${delay}ms`,
  };
}

/* -------------------------------------------------------------------------------------------------
 * Shared Action
 * -----------------------------------------------------------------------------------------------*/
/**
 * @description CTA 버튼의 액션 부분만 담당합니다. fixed 프레임 없이 CTA 룩이 필요한 곳(BottomSheet.Footer 등)에서 `CTAAction`으로 사용합니다.
 */
const CallToAction = React.forwardRef<HTMLButtonElement, CallToActionProps>(
  ({ className, variant = 'filled', color = 'confirm', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="default"
        color="mono"
        size="default"
        className={cn(ctaActionVariants({ variant, color }), className)}
        {...props}
      />
    );
  },
);

CallToAction.displayName = 'CallToAction';

/* -------------------------------------------------------------------------------------------------
 * CTA Button
 * -----------------------------------------------------------------------------------------------*/
function CTAButton({
  open = true,
  hideOnScroll = false,
  animation,
  containerClassName,
  className,
  ...props
}: CTAButtonProps) {
  const isVisible = useCTAVisibility({ open, hideOnScroll });

  return (
    <div
      data-slot="cta-button-frame"
      style={resolveCTAAnimationStyle(animation)}
      className={cn(
        'safe-area-padding-bottom fixed right-0 bottom-0 left-0 z-[var(--z-cta)] px-4 pt-2 pb-3 transition-all duration-300 ease-out',
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-[110%] opacity-0',
        containerClassName,
      )}
    >
      <div className="mx-auto w-full max-w-[480px]">
        <CallToAction className={className} {...props} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CTA Confirm Button
 * -----------------------------------------------------------------------------------------------*/
const CTAConfirmButtonLeft = React.forwardRef<HTMLButtonElement, CallToActionProps>(
  ({ className, ...props }, ref) => {
    return <CallToAction ref={ref} className={cn('w-full', className)} {...props} />;
  },
);

CTAConfirmButtonLeft.displayName = 'CTAConfirmButton.Left';

const CTAConfirmButtonRight = React.forwardRef<HTMLButtonElement, CallToActionProps>(
  ({ className, ...props }, ref) => {
    return <CallToAction ref={ref} className={cn('w-full', className)} {...props} />;
  },
);

CTAConfirmButtonRight.displayName = 'CTAConfirmButton.Right';

function CTAConfirmButtonRoot({
  open = true,
  hideOnScroll = false,
  animation,
  containerClassName,
  className,
  children,
  ...props
}: CTAConfirmButtonRootProps) {
  const isVisible = useCTAVisibility({ open, hideOnScroll });

  return (
    <div
      data-slot="cta-confirm-button-frame"
      style={resolveCTAAnimationStyle(animation)}
      className={cn(
        'safe-area-padding-bottom fixed right-0 bottom-0 left-0 z-[var(--z-cta)] px-4 pt-2 pb-3 transition-all duration-300 ease-out',
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-[110%] opacity-0',
        containerClassName,
      )}
    >
      <div
        className={cn('mx-auto grid w-full max-w-[480px] grid-cols-2 gap-2', className)}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

const CTAConfirmButton = Object.assign(CTAConfirmButtonRoot, {
  Left: CTAConfirmButtonLeft,
  Right: CTAConfirmButtonRight,
});

export {
  CallToAction as CTAAction,
  CTAButton,
  CTAConfirmButton,
  type CallToActionProps as CTAActionProps,
  type CTAAnimation,
  type CTAButtonProps,
  type CTAConfirmButtonRootProps,
};
