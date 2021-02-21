import { expect } from "chai";
import sinon from "sinon";
import { AuthorityFactory } from "../../src/authority/AuthorityFactory";
import { INetworkModule, NetworkRequestOptions } from "../../src/network/INetworkModule";
import { TEST_CONFIG } from "../utils/StringConstants";
import { Constants } from "../../src/utils/Constants";
import { ClientConfigurationErrorMessage } from "../../src/error/ClientConfigurationError";
import { Authority } from "../../src/authority/Authority";
import { AuthorityType } from "../../src/authority/AuthorityType";
import { ClientAuthError, ClientAuthErrorMessage, ProtocolMode } from "../../src";
import { MockCache } from "../cache/MockCache";
import { mockCrypto } from "../client/ClientTestUtils";
import { AuthorityOptions } from "../../src/authority/AuthorityOptions";

describe("AuthorityFactory.ts Class Unit Tests", () => {
    const networkInterface: INetworkModule = {
        sendGetRequestAsync<T>(
            url: string,
            options?: NetworkRequestOptions
        ): T {
            return null;
        },
        sendPostRequestAsync<T>(
            url: string,
            options?: NetworkRequestOptions
        ): T {
            return null;
        }
    };

    const mockCache = new MockCache(TEST_CONFIG.MSAL_CLIENT_ID, mockCrypto);
    const mockStorage = mockCache.cacheManager;
    let authorityOptions: AuthorityOptions;

    beforeEach(() => {
        authorityOptions = {
            protocolMode: ProtocolMode.AAD,
            knownAuthorities: [],
            cloudDiscoveryMetadata: "",
            authorityMetadata: ""
        }
    });

    afterEach(() => {
        mockCache.clearCache();
        sinon.restore();
    });

    it("AuthorityFactory returns null if given url is null or empty", () => {
        expect(() => AuthorityFactory.createInstance("", networkInterface, mockStorage, authorityOptions)).to.throw(ClientConfigurationErrorMessage.urlEmptyError.desc);
        expect(() => AuthorityFactory.createInstance(null, networkInterface, mockStorage, authorityOptions)).to.throw(ClientConfigurationErrorMessage.urlEmptyError.desc);
    });

    it("Throws error for malformed url strings", () => {
        expect(() =>
            AuthorityFactory.createInstance(
                "http://login.microsoftonline.com/common",
                networkInterface,
                mockStorage, 
                authorityOptions
            )
        ).to.throw(ClientConfigurationErrorMessage.authorityUriInsecure.desc);
        expect(() =>
            AuthorityFactory.createInstance(
                "This is not a URI",
                networkInterface,
                mockStorage, 
                authorityOptions
            )
        ).to.throw(ClientConfigurationErrorMessage.urlParseError.desc);
        expect(() =>
            AuthorityFactory.createInstance("", networkInterface, mockStorage, authorityOptions)
        ).to.throw(ClientConfigurationErrorMessage.urlEmptyError.desc);
    });

    it("createInstance returns Default instance if AAD Authority", () => {
        const authorityInstance = AuthorityFactory.createInstance(Constants.DEFAULT_AUTHORITY, networkInterface, mockStorage, authorityOptions);
        expect(authorityInstance.authorityType).to.be.eq(AuthorityType.Default);
        expect(authorityInstance instanceof Authority);
    });

    it("createInstance returns Default instance if B2C Authority", () => {
        const authorityInstance = AuthorityFactory.createInstance(TEST_CONFIG.b2cValidAuthority, networkInterface, mockStorage, authorityOptions);
        expect(authorityInstance.authorityType).to.be.eq(AuthorityType.Default);
        expect(authorityInstance instanceof Authority);
    });

    it("createInstance return ADFS instance if /adfs in path", () => {
        const authorityInstanceAAD = AuthorityFactory.createInstance(TEST_CONFIG.ADFS_VALID_AUTHORITY, networkInterface, mockStorage, authorityOptions);
        expect(authorityInstanceAAD.authorityType).to.be.eq(AuthorityType.Adfs);
        expect(authorityInstanceAAD instanceof Authority);

        authorityOptions.protocolMode = ProtocolMode.OIDC;
        const authorityInstanceOIDC = AuthorityFactory.createInstance(TEST_CONFIG.ADFS_VALID_AUTHORITY, networkInterface, mockStorage, authorityOptions);
        expect(authorityInstanceOIDC.authorityType).to.be.eq(AuthorityType.Adfs);
        expect(authorityInstanceOIDC instanceof Authority);
    });

    it("createInstance returns (non v2) OIDC endpoint with ProtocolMode: OIDC", () => {
        authorityOptions.protocolMode = ProtocolMode.OIDC;
        const authorityInstance = AuthorityFactory.createInstance(Constants.DEFAULT_AUTHORITY, networkInterface, mockStorage, authorityOptions);
        expect(authorityInstance.authorityType).to.be.eq(AuthorityType.Default);
        expect(authorityInstance instanceof Authority);
    });

    it("createDiscoveredInstance calls resolveEndpointsAsync then returns authority", async () => {
        const resolveEndpointsStub = sinon.stub(Authority.prototype, "resolveEndpointsAsync").resolves();
        const authorityInstance = await AuthorityFactory.createDiscoveredInstance(Constants.DEFAULT_AUTHORITY, networkInterface, mockStorage, authorityOptions);
        expect(authorityInstance.authorityType).to.be.eq(AuthorityType.Default);
        expect(authorityInstance instanceof Authority);
        expect(resolveEndpointsStub.calledOnce).to.be.true;
    });

    it("createDiscoveredInstance throws if resolveEndpointsAsync fails", (done) => {
        const resolveEndpointsStub = sinon.stub(Authority.prototype, "resolveEndpointsAsync").throws("Discovery failed.");
        AuthorityFactory.createDiscoveredInstance(Constants.DEFAULT_AUTHORITY, networkInterface, mockStorage, authorityOptions).catch(e => {
            expect(e).to.be.instanceOf(ClientAuthError);
            expect(e.errorMessage).to.include(ClientAuthErrorMessage.endpointResolutionError.desc);
            expect(e.errorMessage).to.include("Discovery failed.");
            expect(resolveEndpointsStub.calledOnce).to.be.true;
            done();
        });
    });
});
