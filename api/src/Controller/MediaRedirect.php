<?php

namespace App\Controller;

use App\Deezer\DeezerException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\EventListener\AbstractSessionListener;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;

/**
 * Redirection vers une image ou un MP3 hébergé ailleurs, à mettre directement dans un `src`,
 * ou 404 s'il n'y en a pas.
 */
trait MediaRedirect
{
    /**
     * @param \Closure(): ?string $find   URL du média
     * @param int                 $maxAge durée pendant laquelle le navigateur peut garder la redirection
     */
    private function redirectToMedia(\Closure $find, int $maxAge): RedirectResponse
    {
        try {
            $url = $find();
        } catch (ExceptionInterface|DeezerException) {
            // Spotify ou Deezer indisponible, ou quota dépassé : rien en cache, on retentera plus tard
            $url = null;
        }

        if (null === $url) {
            throw new NotFoundHttpException();
        }

        $response = new RedirectResponse($url);
        $response->setPrivate()->setMaxAge($maxAge);
        $response->headers->set(AbstractSessionListener::NO_AUTO_CACHE_CONTROL_HEADER, 'true');

        return $response;
    }
}
