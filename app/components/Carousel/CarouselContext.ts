import React from 'react';

export interface CarouselContextProps {
    items: number[];
    shouldAnimate: boolean;
    setShouldAnimate: React.Dispatch<React.SetStateAction<boolean>>;
    activeItem: number | undefined;
    setActiveItem: React.Dispatch<React.SetStateAction<number | undefined>>;
    registerItem: (order: number) => void;
    unregisterItem: (order: number) => void;
    numberOfVisibleItems: number;
    onActiveItemManualChange?: () => void;
}

const CarouselContext = React.createContext<CarouselContextProps>({
    items: [],
    shouldAnimate: true,
    setShouldAnimate: () => {
        // eslint-disable-next-line no-console
        console.warn('CarouselContext::setShouldAnimate called before it was initialized');
    },
    activeItem: undefined,
    setActiveItem: () => {
        // eslint-disable-next-line no-console
        console.warn('CarouselContext::setActiveItem called before it was initialized');
    },
    registerItem: () => {
        // eslint-disable-next-line no-console
        console.warn('CarouselContext::registerItem called before it was initialized');
    },
    unregisterItem: () => {
        // eslint-disable-next-line no-console
        console.warn('CarouselContext::unregisterItem called before it was initialized');
    },
    onActiveItemManualChange: () => {
        // eslint-disable-next-line no-console
        console.warn('CarouselContext::onActiveItemManualChange called before it was initialized');
    },
    numberOfVisibleItems: 1,
});

export default CarouselContext;
