/**
 * BrandMark – Brändin tunnus
 * --------------------------
 * Näyttää oman tunnuskuvan (asetuksista) tai teeman logon
 * (media-kansiosta, ks. src/themes.js). Käytetään yläpalkissa ja
 * arvontaikkunassa, jotta brändi näkyy myös Stream modessa.
 */

export default function BrandMark({ branding, profile, className = "" }) {
  // Oma tunnuskuva (asetuksista) menee teeman logon edelle.
  const custom = Boolean(branding.image);
  const src = custom ? branding.image : profile.logo;
  const fit = custom ? "contain" : profile.logoFit;

  return (
    <div className={`branding-preview logo-fit-${fit} ${className}`}>
      <img
        className={`brand-custom-image animation-${branding.animation}`}
        src={src}
        alt={`${profile.label}-tunnus`}
        draggable={false}
      />
    </div>
  );
}
