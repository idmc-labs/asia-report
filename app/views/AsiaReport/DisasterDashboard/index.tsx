import React, { useMemo, useState } from 'react';
import {
    MultiSelectInput,
} from '@togglecorp/toggle-ui';
import {
    _cs,
    compareNumber,
    compareString,
    unique,
} from '@togglecorp/fujs';
import {
    gql,
    useQuery,
} from '@apollo/client';
import {
    IoDownloadOutline,
    IoExitOutline,
} from 'react-icons/io5';

import {
    ResponsiveContainer,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

import {
    DisasterDataQuery,
    DisasterDataQueryVariables,
    DisasterCategoriesQuery,
    DisasterCategoriesQueryVariables,
    CategoryStatisticsType,
} from '#generated/types';

import ErrorBoundary from '#components/ErrorBoundary';
import ButtonLikeLink from '#components/ButtonLikeLink';
import Header from '#components/Header';
import Infographic from '#components/Infographic';
import SliderInput from '#components/SliderInput';
import Container from '#components/Container';
import TooltipIcon from '#components/TooltipIcon';

import {
    formatNumber,
    countryWithRegionMap,
    countriesNameMap,
    regionsNameMap,
    countries,
    regions,
} from '#utils/common';

import useDebouncedValue from '../../../hooks/useDebouncedValue';

import { countryMetadata } from './data';

import styles from './styles.css';

const DRUPAL_ENDPOINT = process.env.REACT_APP_DRUPAL_ENDPOINT as string || '';

function suffixDrupalEndpoing(path: string) {
    return `${DRUPAL_ENDPOINT}${path}`;
}

const REST_ENDPOINT = process.env.REACT_APP_REST_ENDPOINT as string;

function suffixGiddRestEndpoint(path: string) {
    return `${REST_ENDPOINT}${path}`;
}

const disasterCategoryKeySelector = (d: CategoryStatisticsType) => d.label;
const regionKeySelector = (region: { key: string }) => region.key;
const regionLabelSelector = (region: { value: string }) => region.value;

const countryKeySelector = (country: { iso3: string }) => country.iso3;
const countryLabelSelector = (country: { name: string }) => country.name;

const START_YEAR = 2010;
const END_YEAR = 2021;

const giddLink = suffixDrupalEndpoing('/database/displacement-data');

const disasterColorSchemes = [
    // 'rgb(6, 23, 158)',
    // 'rgb(8, 56, 201)',
    // 'rgb(8, 116, 226)',
    'rgb(1, 142, 202)',
    'rgb(45, 183, 226)',
    'rgb(94, 217, 238)',
];

const categoricalColorScheme = [
    'rgb(6, 23, 158)',
    'rgb(8, 56, 201)',
    'rgb(8, 116, 226)',
    'rgb(1, 142, 202)',
    'rgb(45, 183, 226)',
    'rgb(94, 217, 238)',
];

const chartMargins = { top: 16, left: 5, right: 5, bottom: 5 };

const DISASTER_DATA = gql`
    query DisasterData(
        $countryIso3: [String!],
        $startYear: Int,
        $endYear: Int,
        $categories: [String!],
    ) {
        disasterStatistics(filters: {
            countriesIso3: $countryIso3,
            endYear: $endYear,
            startYear: $startYear,
            categories: $categories,
        }) {
            newDisplacements
            totalEvents
            categories {
                label
                total
            }
            timeseries {
                country {
                    id
                    iso3
                    countryName
                }
                total
                year
            }
        }
    }
`;

const DISASTER_CATEGORIES = gql`
    query DisasterCategories(
        $countryIso3: [String!],
    ) {
        disasterStatistics(filters: { countriesIso3: $countryIso3 }) {
            categories {
                label
                total
            }
        }
    }
`;

interface Props {
    className?: string;
}

function CountryProfile(props: Props) {
    const {
        className,
    } = props;

    // Disaster section
    const [disasterCategories, setDisasterCategories] = useState<string[]>([]);
    const [regionValues, setRegionValues] = useState<string[]>([]);
    const [countriesValues, setCountriesValues] = useState<string[]>([]);
    const [disasterTimeRangeActual, setDisasterTimeRange] = useState([START_YEAR, END_YEAR]);
    const disasterTimeRange = useDebouncedValue(disasterTimeRangeActual);

    const selectedCountries = useMemo(() => {
        if (regionValues.length === 0 && countriesValues.length === 0) {
            return countries.map((country) => country.iso3);
        }
        const countriesFromRegions = regions
            .filter((region) => regionValues.includes(region.key))
            .map((region) => region.countries).flat();

        return (unique([
            ...countriesFromRegions,
            ...countriesValues,
        ], (d) => d));
    }, [
        regionValues,
        countriesValues,
    ]);

    const {
        data: disasterCategoryOptions,
    } = useQuery<DisasterCategoriesQuery, DisasterCategoriesQueryVariables>(
        DISASTER_CATEGORIES,
        {
            variables: { countryIso3: selectedCountries },
        },
    );

    const categories = useMemo(() => (
        [...(disasterCategoryOptions?.disasterStatistics.categories ?? [])]
            .sort((a, b) => compareString(a.label, b.label))
    ), [disasterCategoryOptions?.disasterStatistics.categories]);

    const {
        previousData: previousDisasterData,
        data: disasterData = previousDisasterData,
        // FIXME: handle loading and error
        // loading: disasterDataLoading,
        // error: disasterDataError,
    } = useQuery<DisasterDataQuery, DisasterDataQueryVariables>(
        DISASTER_DATA,
        {
            variables: {
                countryIso3: selectedCountries,
                startYear: disasterTimeRange[0],
                endYear: disasterTimeRange[1],
                categories: disasterCategories,
            },
        },
    );

    const noOfSelections = useMemo(() => ([
        ...regionValues,
        ...countriesValues,
    ]), [regionValues, countriesValues]);

    const isMultiline = noOfSelections.length > 1 && noOfSelections.length < 5;

    const lineChartData = useMemo(() => {
        const data = disasterData?.disasterStatistics?.timeseries;
        if (!data) {
            return undefined;
        }
        if (isMultiline) {
            const countriesChartData = data
                .filter((item) => countriesValues.includes(item.country.iso3))
                .map((item) => ({
                    [item.country.iso3]: item.total,
                    year: item.year,
                    type: 'country',
                    total: Number(item.total),
                }));

            const regionChartData = data
                .map((item) => ({ ...item, regionKey: countryWithRegionMap[item.country.iso3] }))
                .filter((item) => regionValues.includes(item.regionKey))
                .reduce((acc, item) => {
                    const itemInAccIndex = acc.findIndex(
                        (accItem) => (
                            accItem.year === Number(item.year)
                            && accItem.regionKey === item.regionKey
                        ),
                    );
                    if (itemInAccIndex === -1) {
                        return [
                            ...acc,
                            {
                                [item.regionKey]: item.total,
                                year: Number(item.year),
                                total: item.total,
                                regionKey: item.regionKey,
                            },
                        ];
                    }
                    const newItem = {
                        [item.regionKey]: item.total + acc[itemInAccIndex].total,
                        year: Number(item.year),
                        total: item.total + acc[itemInAccIndex].total,
                        regionKey: item.regionKey,
                    };
                    acc.splice(itemInAccIndex, 1);
                    return ([
                        ...acc,
                        newItem,
                    ]);
                }, [] as { year: number; total: number; regionKey: string; }[]);

            return [...countriesChartData, ...regionChartData];
        }
        return data.reduce(
            (acc, item) => {
                const itemInAccIndex = acc.findIndex(
                    (accItem) => (
                        accItem.year === Number(item.year)
                    ),
                );
                if (itemInAccIndex === -1) {
                    return [
                        ...acc,
                        {
                            year: Number(item.year),
                            total: item.total,
                        },
                    ];
                }
                const newItem = {
                    year: Number(item.year),
                    total: item.total + acc[itemInAccIndex].total,
                };
                acc.splice(itemInAccIndex, 1);
                return ([
                    ...acc,
                    newItem,
                ]);
            },
            [] as { year: number; total: number}[],
        );
    }, [disasterData, isMultiline, countriesValues, regionValues]);

    const dataDownloadLink = suffixGiddRestEndpoint(`/countries/multiple-countries-disaster-export/?countries_iso3=${selectedCountries.join(',')}&start_year=${disasterTimeRange[0]}&end_year=${disasterTimeRange[1]}&hazard_type=${disasterCategories.join(',')}`);

    const pieChartData = useMemo(() => (
        [...(disasterData?.disasterStatistics.categories ?? [])]?.sort(
            (a, b) => compareNumber(a.total, b.total),
        )
    ), [
        disasterData?.disasterStatistics.categories,
    ]);

    return (
        <Container
            className={_cs(className, styles.displacementData)}
            heading={countryMetadata.disasterHeader}
            headingSize="small"
            headerClassName={styles.disasterHeader}
            headingClassName={styles.disasterHeading}
            headingInfo={(
                <TooltipIcon>
                    {countryMetadata.disasterTooltip}
                </TooltipIcon>
            )}
            footerActions={(
                <>
                    <ButtonLikeLink
                        href={dataDownloadLink}
                        target="_blank"
                        className={styles.disasterButton}
                        rel="noopener noreferrer"
                        icons={(
                            <IoDownloadOutline />
                        )}
                    >
                        Download Disaster Data
                    </ButtonLikeLink>
                    <ButtonLikeLink
                        href={giddLink}
                        className={styles.disasterButton}
                        target="_blank"
                        rel="noopener noreferrer"
                        icons={(
                            <IoExitOutline />
                        )}
                    >
                        View Full Database
                    </ButtonLikeLink>
                </>
            )}
            filters={(
                <>
                    <Header
                        heading="Subregions"
                        headingSize="extraSmall"
                        description={(
                            <MultiSelectInput
                                className={styles.selectInput}
                                inputSectionClassName={styles.inputSection}
                                placeholder="Subregions"
                                name="regions"
                                value={regionValues}
                                options={regions}
                                keySelector={regionKeySelector}
                                labelSelector={regionLabelSelector}
                                onChange={setRegionValues}
                            />
                        )}
                    />
                    <Header
                        heading="Countries"
                        headingSize="extraSmall"
                        description={(
                            <MultiSelectInput
                                className={styles.selectInput}
                                inputSectionClassName={styles.inputSection}
                                placeholder="Countries"
                                name="countries"
                                value={countriesValues}
                                options={countries}
                                keySelector={countryKeySelector}
                                labelSelector={countryLabelSelector}
                                onChange={setCountriesValues}
                            />
                        )}
                    />
                    <Header
                        heading="Disaster Category"
                        headingSize="extraSmall"
                        description={(
                            <MultiSelectInput
                                className={styles.selectInput}
                                inputSectionClassName={styles.inputSection}
                                placeholder="Disaster Category"
                                name="disasterCategory"
                                value={disasterCategories}
                                options={categories}
                                keySelector={disasterCategoryKeySelector}
                                labelSelector={disasterCategoryKeySelector}
                                onChange={setDisasterCategories}
                            />
                        )}
                    />
                    <SliderInput
                        className={styles.timeRangeContainer}
                        hideValues
                        min={START_YEAR}
                        max={END_YEAR}
                        labelDescription={`${disasterTimeRangeActual[0]} - ${disasterTimeRangeActual[1]}`}
                        step={1}
                        minDistance={0}
                        value={disasterTimeRangeActual}
                        onChange={setDisasterTimeRange}
                    />
                </>
            )}
        >
            <div className={styles.infographicList}>
                <Infographic
                    className={styles.disasterInfographic}
                    totalValue={disasterData
                        ?.disasterStatistics.newDisplacements || 0}
                    description={(
                        <div>
                            <Header
                                headingClassName={styles.heading}
                                heading="Internal Displacements"
                                headingSize="extraSmall"
                                headingInfo={(
                                    <TooltipIcon>
                                        {countryMetadata?.disasterInternalDisplacementTooltip}
                                    </TooltipIcon>
                                )}
                            />
                        </div>
                    )}
                    date={`${disasterTimeRangeActual[0]} - ${disasterTimeRangeActual[1]}`}
                    chart={lineChartData && (
                        <ErrorBoundary>
                            <ResponsiveContainer>
                                <LineChart
                                    data={lineChartData}
                                    margin={chartMargins}
                                >
                                    <CartesianGrid
                                        vertical={false}
                                        strokeDasharray="3 3"
                                    />
                                    <XAxis
                                        dataKey="year"
                                        axisLine={false}
                                        type="number"
                                        allowDecimals={false}
                                        domain={disasterTimeRange}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickFormatter={formatNumber}
                                    />
                                    <Tooltip
                                        formatter={formatNumber}
                                    />
                                    <Legend />
                                    {isMultiline ? (
                                        noOfSelections.map((item, i) => (
                                            <Line
                                                key={item}
                                                dataKey={item}
                                                name={
                                                    selectedCountries.length > 1
                                                        ? (
                                                            countriesNameMap[item]
                                                                ?? regionsNameMap[item]
                                                                ?? item
                                                        ) : 'Disaster internal displacements'
                                                }
                                                strokeWidth={2}
                                                connectNulls
                                                dot
                                                stroke={disasterColorSchemes[
                                                    i % disasterColorSchemes.length
                                                ]}
                                            />
                                        ))
                                    ) : (
                                        <Line
                                            dataKey="total"
                                            key="total"
                                            stroke="var(--color-disaster)"
                                            name="Internal Displacements"
                                            strokeWidth={2}
                                            connectNulls
                                            dot
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </ErrorBoundary>
                    )}
                />
                <Infographic
                    className={styles.disasterInfographic}
                    totalValue={disasterData
                        ?.disasterStatistics.totalEvents || 0}
                    description={(
                        <Header
                            headingClassName={styles.heading}
                            heading="Disaster Events Reported"
                            headingSize="extraSmall"
                            headingInfo={(
                                <TooltipIcon>
                                    {countryMetadata?.disasterEventTooltip}
                                </TooltipIcon>
                            )}
                        />
                    )}
                    date={`${disasterTimeRangeActual[0]} - ${disasterTimeRangeActual[1]}`}
                    chart={pieChartData && (
                        <ErrorBoundary>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip
                                        formatter={formatNumber}
                                    />
                                    <Legend />
                                    <Pie
                                        data={pieChartData}
                                        dataKey="total"
                                        nameKey="label"
                                        startAngle={90}
                                        endAngle={450}
                                    >
                                        {disasterData
                                            ?.disasterStatistics
                                            ?.categories
                                            ?.map(({ label }, index) => (
                                                <Cell
                                                    key={label}
                                                    fill={categoricalColorScheme[
                                                        index % categoricalColorScheme.length
                                                    ]}
                                                />
                                            ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </ErrorBoundary>
                    )}
                />
            </div>
        </Container>
    );
}

export default CountryProfile;
