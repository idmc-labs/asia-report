import { ApolloClientOptions, NormalizedCacheObject, InMemoryCache, ApolloLink as ApolloLinkFromClient, HttpLink, from } from '@apollo/client';
import { RestLink } from 'apollo-link-rest';

const GRAPHQL_ENDPOINT = process.env.REACT_APP_GRAPHQL_ENDPOINT as string;
const HELIX_ENDPOINT = process.env.REACT_APP_HELIX_ENDPOINT as string;
const DRUPAL_ENDPOINT = process.env.REACT_APP_DRUPAL_ENDPOINT as string || '';

const link = new HttpLink({
    uri: GRAPHQL_ENDPOINT,
    credentials: 'include',
}) as unknown as ApolloLinkFromClient;

const restLink = new RestLink({
    endpoints: {
        helix: HELIX_ENDPOINT,
        drupal: DRUPAL_ENDPOINT,
    },
    credentials: 'omit',
}) as unknown as ApolloLinkFromClient;

/*
const link: ApolloLinkFromClient = ApolloLink.from([
    new RetryLink(),
    ApolloLink.split(
        (operation) => operation.getContext().hasUpload,
        createUploadLink({
            uri: GRAPHQL_ENDPOINT,
            credentials: 'include',
        }) as unknown as ApolloLink,
        ApolloLink.from([
            new RestLink({
                uri: 'https://osmnames.idmcdb.org',
            }) as unknown as ApolloLink,
            new BatchHttpLink({
                uri: GRAPHQL_ENDPOINT,
                credentials: 'include',
            }),
        ]),
    ),
]) as unknown as ApolloLinkFromClient;
*/

const apolloOptions: ApolloClientOptions<NormalizedCacheObject> = {
    link: from([restLink, link]),
    cache: new InMemoryCache(),
    assumeImmutableResults: true,
    defaultOptions: {
        query: {
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
        },
        watchQuery: {
            fetchPolicy: 'cache-and-network',
            nextFetchPolicy: 'cache-and-network',
            errorPolicy: 'all',
        },
    },
};

export default apolloOptions;
