import { Link } from 'react-router-dom'

export default function Footer({ back }) {
  return (
    <footer>
      {back && (
        <><Link to={back.to}>{back.label}</Link><span className="sep">·</span></>
      )}
      <a href="https://github.com/thelias/pota-wiki/issues/new" target="_blank" rel="noreferrer">Report a bug</a>
      <br/>
      Park data from <a href="https://pota.app" target="_blank" rel="noreferrer">Parks on the Air®</a>
    </footer>
  )
}
