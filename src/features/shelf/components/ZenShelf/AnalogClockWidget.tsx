import React, { useEffect, useMemo, useState } from 'react';
import styles from './ZenShelf.module.css';

export const ANALOG_CLOCK_WIDGET_SIZE = 212;
const CLOCK_CENTER = ANALOG_CLOCK_WIDGET_SIZE / 2;
const ROUNDED_SQUARE_CORNER_RADIUS = 32;
const SQUIRCLE_EXPONENT = 4;
const SQUIRCLE_DIAGONAL_COMPONENT = 2 ** (-1 / SQUIRCLE_EXPONENT);
const TICK_OVERFLOW = 2;
const MAX_CORNER_TICK_EXTENSION = 4;

type ClockShape = 'circle' | 'roundedSquare';

interface Point {
    x: number;
    y: number;
}

interface TickDimensions {
    width: number;
    innerDepth: number;
}

interface ClockHands {
    hour: number;
    minute: number;
    second: number;
}

const getClockHands = (date: Date): ClockHands => ({
    hour: ((date.getHours() % 12) + date.getMinutes() / 60 + date.getSeconds() / 3600) * 30,
    minute: (date.getMinutes() + date.getSeconds() / 60) * 6,
    second: date.getSeconds() * 6,
});

const formatTime = (date: Date): string => (
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
);

const getRoundedSquareBoundaryValue = (x: number, y: number): number => {
    const straightEdge = CLOCK_CENTER - ROUNDED_SQUARE_CORNER_RADIUS;
    const cornerX = Math.max(Math.abs(x) - straightEdge, 0) / ROUNDED_SQUARE_CORNER_RADIUS;
    const cornerY = Math.max(Math.abs(y) - straightEdge, 0) / ROUNDED_SQUARE_CORNER_RADIUS;

    // A local fourth-order superellipse matches CSS `corner-shape: squircle`
    // while retaining the rounded square's four straight edge sections.
    return cornerX ** SQUIRCLE_EXPONENT + cornerY ** SQUIRCLE_EXPONENT;
};

const getBoundaryDistance = (
    radial: Point,
    tangent: Point,
    tangentOffset: number,
    shape: ClockShape,
): number => {
    if (shape === 'circle') {
        return Math.sqrt(CLOCK_CENTER ** 2 - tangentOffset ** 2);
    }

    let lowerBound = 0;
    let upperBound = CLOCK_CENTER * 2;

    // Intersect each long side of the tick independently with the squircle.
    // This compensates for the unequal X/Y reach of a rotated rectangle: both
    // sides cross the face boundary at the same visual depth.
    for (let iteration = 0; iteration < 40; iteration += 1) {
        const radialDistance = (lowerBound + upperBound) / 2;
        const x = radialDistance * radial.x + tangentOffset * tangent.x;
        const y = radialDistance * radial.y + tangentOffset * tangent.y;

        if (getRoundedSquareBoundaryValue(x, y) < 1) {
            lowerBound = radialDistance;
        } else {
            upperBound = radialDistance;
        }
    }

    return (lowerBound + upperBound) / 2;
};

const getPoint = (radial: Point, tangent: Point, radialDistance: number, tangentOffset: number): Point => ({
    x: CLOCK_CENTER + radialDistance * radial.x + tangentOffset * tangent.x,
    y: CLOCK_CENTER + radialDistance * radial.y + tangentOffset * tangent.y,
});

const getCornerTickExtension = (index: number, shape: ClockShape): number => {
    if (shape !== 'roundedSquare') return 0;

    const angle = index * 6 * Math.PI / 180;
    const radial = { x: Math.sin(angle), y: -Math.cos(angle) };
    const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
    const boundaryDistance = getBoundaryDistance(radial, tangent, 0, shape);
    const straightEdge = CLOCK_CENTER - ROUNDED_SQUARE_CORNER_RADIUS;
    const cornerX = Math.max(Math.abs(boundaryDistance * radial.x) - straightEdge, 0)
        / ROUNDED_SQUARE_CORNER_RADIUS;
    const cornerY = Math.max(Math.abs(boundaryDistance * radial.y) - straightEdge, 0)
        / ROUNDED_SQUARE_CORNER_RADIUS;
    const cornerWeight = Math.min(cornerX, cornerY) / SQUIRCLE_DIAGONAL_COMPONENT;

    // Only the curved sections need optical compensation. The extension fades
    // in from each straight edge and peaks around the visual corner diagonal.
    return MAX_CORNER_TICK_EXTENSION * Math.min(cornerWeight, 1);
};

const formatPoint = ({ x, y }: Point): string => `${x.toFixed(3)},${y.toFixed(3)}`;

const moveTowards = (from: Point, to: Point, distance: number): Point => {
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;
    const length = Math.hypot(deltaX, deltaY);
    const ratio = Math.min(distance / length, 0.5);

    return {
        x: from.x + deltaX * ratio,
        y: from.y + deltaY * ratio,
    };
};

const getRoundedPolygonPath = (points: Point[], radius: number): string => {
    const corners = points.map((point, index) => ({
        point,
        start: moveTowards(point, points[(index - 1 + points.length) % points.length], radius),
        end: moveTowards(point, points[(index + 1) % points.length], radius),
    }));

    return [
        `M ${formatPoint(corners[0].start)}`,
        ...corners.flatMap(({ point, end }, index) => [
            `Q ${formatPoint(point)} ${formatPoint(end)}`,
            `L ${formatPoint(corners[(index + 1) % corners.length].start)}`,
        ]),
        'Z',
    ].join(' ');
};

const getTickPath = (index: number, dimensions: TickDimensions, shape: ClockShape): string => {
    const angle = index * 6 * Math.PI / 180;
    const radial = { x: Math.sin(angle), y: -Math.cos(angle) };
    const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
    const halfWidth = dimensions.width / 2;
    const leftBoundary = getBoundaryDistance(radial, tangent, -halfWidth, shape);
    const rightBoundary = getBoundaryDistance(radial, tangent, halfWidth, shape);
    const points = [
        getPoint(radial, tangent, leftBoundary + TICK_OVERFLOW, -halfWidth),
        getPoint(radial, tangent, rightBoundary + TICK_OVERFLOW, halfWidth),
        getPoint(radial, tangent, rightBoundary - dimensions.innerDepth, halfWidth),
        getPoint(radial, tangent, leftBoundary - dimensions.innerDepth, -halfWidth),
    ];

    return getRoundedPolygonPath(points, halfWidth);
};

interface AnalogClockWidgetProps {
    scale?: number;
    shape?: ClockShape;
}

export const AnalogClockWidget: React.FC<AnalogClockWidgetProps> = ({ scale = 1, shape = 'circle' }) => {
    const [now, setNow] = useState(() => new Date());
    const hands = getClockHands(now);
    const ticks = useMemo(() => Array.from({ length: 60 }, (_, index) => {
        const isMajor = index % 5 === 0;
        const dimensions = isMajor
            ? { width: 3, innerDepth: 14 }
            : { width: 2, innerDepth: 8 + getCornerTickExtension(index, shape) };

        return { index, isMajor, path: getTickPath(index, dimensions, shape) };
    }), [shape]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <div
            className={`${styles.analogClockWidget} ${shape === 'roundedSquare' ? styles.analogClockRoundedSquare : ''}`}
            style={{
                width: ANALOG_CLOCK_WIDGET_SIZE * scale,
                height: ANALOG_CLOCK_WIDGET_SIZE * scale,
                '--analog-scale': scale,
            } as React.CSSProperties}
            role="timer"
            aria-label={`Current time ${formatTime(now)}`}
        >
            <div className={styles.analogClockFace}>
                <svg
                    className={styles.analogClockTicks}
                    viewBox={`0 0 ${ANALOG_CLOCK_WIDGET_SIZE} ${ANALOG_CLOCK_WIDGET_SIZE}`}
                    aria-hidden="true"
                >
                    {ticks.map(({ index, isMajor, path }) => (
                        <path
                            key={index}
                            className={`${styles.analogClockTick} ${isMajor ? styles.analogClockMajorTick : ''}`}
                            d={path}
                        />
                    ))}
                </svg>

                <div className={styles.analogClockHands} aria-hidden="true">
                    <span
                        className={`${styles.analogClockHand} ${styles.analogClockHourHand}`}
                        style={{ '--hand-angle': `${hands.hour - 90}deg` } as React.CSSProperties}
                    />
                    <span
                        className={`${styles.analogClockHand} ${styles.analogClockMinuteHand}`}
                        style={{ '--hand-angle': `${hands.minute}deg` } as React.CSSProperties}
                    />
                    <span
                        className={`${styles.analogClockHand} ${styles.analogClockSecondHand}`}
                        style={{ '--hand-angle': `${hands.second}deg` } as React.CSSProperties}
                    />
                    <span className={styles.analogClockCenterHub} />
                </div>
            </div>
        </div>
    );
};
