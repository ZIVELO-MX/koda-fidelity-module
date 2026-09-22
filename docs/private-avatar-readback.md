# Private avatar readback

Private customer and business avatars are stored as paths, not permanent URLs. Authenticated profile and business reads return a fresh `avatarUrl` for the stored asset, valid for one hour.

- `GET /api/customer/profile` returns `profile.avatarUrl` or `null`.
- `GET /api/business` returns `business.avatarUrl` or `null`.
- Upload responses keep the existing top-level `signedUrl` and also include `avatarUrl` on the returned resource.
- Responses are `Cache-Control: private, no-store` because signed URLs expire.
- Only paths under the authenticated resource prefix are signed: `customer/{profileId}/` or `business/{businessId}/`.
- `PUT /api/customer/profile` accepts the name without clearing a previously uploaded avatar. Clients update the image through `PUT /api/customer/profile/avatar`.

Raw storage paths remain internal persistence values: profile responses omit `avatarPath`, and business upload responses omit `avatarPath` and `asset.storagePath`. Clients should render `avatarUrl` and request the profile or business resource again after a reload.

The business avatar is stored in `BusinessAvatarAsset`, not on `Business`; `GET /api/business` performs one indexed lookup for the latest live asset. Eliminating that lookup would require a persisted pointer and consistency work, so it remains a known cost of this contract.
