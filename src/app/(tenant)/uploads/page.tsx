import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import { redirect } from 'next/navigation';
import { UploadsManager } from './components/uploads-manager';
import { getUploads } from './actions';

export default async function UploadsPage() {
    let tenant;
    try {
        tenant = await getTenantFromSession();
    } catch (error) {
        redirect('/login');
    }

    const tenantId = tenant._id.toString();
    const uploads = await getUploads(tenantId);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Uploads</h1>
                <p className="text-muted-foreground">
                    Gerencie seus arquivos de mídia (imagens, vídeos, documentos).
                </p>
            </div>

            <UploadsManager initialUploads={uploads} tenantId={tenantId} />
        </div>
    );
}
