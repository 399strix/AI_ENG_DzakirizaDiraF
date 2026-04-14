import { useEffect, useState } from 'react'
import '../App.css'
import Loading from '../components/Loading'
import Chat from '../components/Chat'

export const RecieptExtraction: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {

  }, [])

  const fileInputHandler = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true)
    const files = event.target.files;
    if(!files|| event.target.files?.length === 0) return;

    for(const file of Array.from(files)){
      const formdata = new FormData();
      formdata.append('file', file);
      try{
        await fetch('http://localhost:3000/rag-service/upsert-collection', {
          method: 'POST',
          headers: {
            // 'Content-Type': 'application/octet-stream',
            'file-name': file.name,
          },
          body: formdata,
        });
      }catch(error){
        console.error('Error occurred while fetching data:', error);
      }
    }
    setIsLoading(false)
  }
  return (
    <>
        <section id="left">
            <label htmlFor="file-upload" style={{cursor: 'pointer'}}>Upload File Here</label>
            <input type="file" id="file-upload" style={{display : 'none'}} accept='.pdf, .jpeg, .png, .jpg' onChange={fileInputHandler}/>  
        </section>
        <section id="center">                
          <div>
            {isLoading ? (<Loading message="Ingesting data..." />) : 
              (
                <Chat send='halo' recieve='iya'/>
              )}
          </div>
            
        </section>

        <section id="spacer"></section>
    </>
  )
}

export default RecieptExtraction
