/**
 * BrandMark – Brändin tunnus
 * --------------------------
 * Näyttää oman tunnuskuvan (asetuksista) tai oletuksena Prodiscus-merkin.
 * Käytetään yläpalkissa ja arvontaikkunassa, jotta brändi näkyy myös
 * Stream modessa, jossa yläpalkki on piilossa.
 */

export default function BrandMark({ branding, className = "" }) {
  return (
    <div className={`branding-preview ${className}`}>
      {branding.image ? (
        <img
          className={`brand-custom-image animation-${branding.animation}`}
          src={branding.image}
          alt="Tunnus"
        />
      ) : (
        <div className="prodiscus-wordmark">
          <span className="prodiscus-disc">P</span>
          <span>PRODISCUS</span>
        </div>
      )}
    </div>
  );
}
