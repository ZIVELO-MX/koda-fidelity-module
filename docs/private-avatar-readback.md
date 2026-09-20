# Private avatar readback

Private customer and business avatars are stored as paths, not permanent URLs. Authenticated profile and business reads return a fresh `avatarUrl` for the stored asset, valid for one hour.

- `GET /api/customer/profile` returns `profile.avatarUrl` or `null`.
- `GET /api/business` returns `business.avatarUrl` or `null`.
- Upload responses keep the existing top-level `signedUrl` and also include `avatarUrl` on the returned resource.
- Responses are `Cache-Control: private, no-store` because signed URLs expire.
- Only paths under the authenticated resource prefix are signed: `customer/{profileId}/` or `business/{businessId}/`.

The raw storage path remains an internal persistence value. Clients should render `avatarUrl` and request the profile or business resource again after a reload.
