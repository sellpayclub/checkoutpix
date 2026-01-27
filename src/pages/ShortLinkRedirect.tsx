
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShortLink } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function ShortLinkRedirect() {
    const { slug } = useParams();
    const [error, setError] = useState(false);

    useEffect(() => {
        if (slug) {
            getShortLink(slug)
                .then(url => {
                    if (url) {
                        window.location.href = url;
                    } else {
                        setError(true);
                    }
                })
                .catch(() => setError(true));
        }
    }, [slug]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Link não encontrado</h1>
                    <p className="text-gray-400">O link que você tentou acessar não existe ou expirou.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
                <p className="text-gray-400 animate-pulse">Redirecionando...</p>
            </div>
        </div>
    );
}
