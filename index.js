var v = null
                    var itemsPage = 20
                    var all_results = {}
                    
                    makeRetrievalPlot = () => {
                        plotRetrieval.innerHTML=''
                        
                        let url=vcfURL.value;   
                        Vcf(url).then( async (value) => {
                            v = value
                            var multi = [1,2,3,4,5, 6]
                            var yinfo = await Promise.all( multi.map( async i => {
                                var endr = 100*(10**i)
                                //console.log(endr)
                                if(endr < v.size){
                                    range = [0, endr]
                                    var st = performance.now()
                                    let res =  await v.fetchGz(range)
                                    var end = performance.now()
                                    var diff = Number((end-st).toFixed(2))
                                    console.log(diff)
                                    return [`Range 0-10^${i+2}`, diff]
                                }
                            }))
                            //console.log(yinfo)
                            
                            if(yinfo.length>0){
                                var x = []
                                var y1_time = []
                                yinfo.forEach( i => {
                                    x.push(i[0])
                                    y1_time.push( i[1] )
                                })
                                
                                var trace1 = {
                                  x: x,
                                  y: y1_time,
                                  text: y1_time, 
                                  name: 'Execution Time',
                                  type: 'bar'
                                };

                                var data = [trace1];

                                var layout = {
                                  title: 'Retrieval Performance comparison',
                                  xaxis: {title: 'Retrieval Ranges'},
                                  yaxis: {title: 'Time (ms)'}
                                };

                                Plotly.newPlot('plotRetrieval', data, layout);
                            }
                        })
                    }
                    
                    readRangeFun=async _=>{
                        
                        readRange.innerHTML="Reading ..."
                        readRange.disabled=true
                        
                        infoFile.style.display="none"
                        
                        if(rangeTextArea.style.height.length==0){
                            rangeTextArea.style.height='10em'
                            rangeTextArea.style.width='100%'
                        }
                        
                        let url=vcfURL.value;   
                        let start = parseInt(rangeStart.value)>0 ? parseInt(rangeStart.value) : 0
                        let end = (parseInt(rangeEnd.value)>0 && parseInt(rangeEnd.value)>start ) ? parseInt(rangeEnd.value) : start+10000
                        rangeStart.value = start
                        rangeEnd.value = end
                        let range=[start, end]
                        
                        Vcf(url).then( async (value) => {
                            v = value
                            console.log(v.cols)
                            /*
                            var txtChrom = "<option value='0'>Select a chromosome </option> "
                            v.chrCode.forEach( x => { if(x!='0') { txtChrom+=`<option value="${x}">Chromosome ${x}</option>` } } )
                            chrom.innerHTML=txtChrom
                            */
                            
                            let p = null
                            if( url.indexOf('.gz')!=-1 ){
                                let start=range[0]
                                
                                let res =  await v.fetchGz(range)
                                rangeTextArea.value= (res.txt)
                            }else{
                                r =  await v.fetchRange(range)
                                rangeTextArea.value=(await r.text())
                            }
                            var size = v.size || await vcf.fileSize(url)
                            filesize.innerHTML = (size/1000000).toFixed(2)+'M'
                            
                            
                            readRange.innerHTML="Read"
                            readRange.disabled=false
                            
                            infoFile.style.display="block"
                        })
                    }
                    
                    
                    makeHeader = (cols) => {
                        var columns=""
                        cols.forEach( x => { columns += `<th scope="col"> ${x} </th>` } )
                        columns = `<tr> ${columns} </tr>`
                        tableHeader.innerHTML=columns
                    }
                    
                    makePages = (numPages) => {
                        pagesContainer.innerHTML=''
                        
                        var pagesContent=''
                        for(var i=1; i<=numPages; i++){
                            pagesContent+=`<li class="page-item " id="pit${i}" ><a class="page-link" href="javascript:void(0)" onClick="passPage(${i}); event.preventDefault();" > ${i} </a></li>`
                        }
                        pagesContainer.innerHTML=pagesContent
                    }
                    
                    passPage = (page) => {
                        handleHits(all_results, page-1)
                    }
                    
                    handleHits = (result, start) => {
                    
                        var hits=[]
                        if(result.hit.length==0){
                            if(result.range==undefined){
                                alert('The chromosome used in the search was not found in the VCF file')
                            }
                            else{
                                if(result.range.dt.length>0){
                                    hits=result.range.dt
                                    infoTable.innerHTML='There were no exact matches for the position, but these are the closest SNPs from the queried position'
                                }
                            }
                        }
                        else{
                            hits=result.hit
                            infoTable.innerHTML='These are the results found for the queried position and chromosome'
                        }
                        
                        if(hits.length>0){
                            if(hits.length > itemsPage){
                                var numPages = Math.ceil(hits.length/itemsPage)
                                makePages(numPages)
                                document.getElementById('pit'+(start+1)).className='page-item active'
                            }  
                            else{
                                pagesContainer.innerHTML=''
                            }
                            start=start*itemsPage
                            hits = hits.slice(start, start+itemsPage)
                            
                            var table_info=''
                            hits.forEach( x => {
                                var temp=''
                                x.forEach( y => {
                                    temp+=`<td>${y}</td>`
                                })
                                table_info+=`<tr>${temp}</tr>`
                            })
                            
                            filteredSnps.style.display='block'
                            tableBody.innerHTML=table_info 
                            
                        }
                    }
                    
                    filterFun = async _=> {
                        
                        filter.innerHTML="Filtering ..."
                        filter.disabled=true
                                
                        var chromosome = chrom.value
                        var pos = position.value
                        
                        if(chromosome!='0' && chromosome!='' && pos!='0' && pos!=''){
                            filteredSnps.style.display='none'
                            
                            let url=vcfURL.value;  
                            Vcf(url).then( async (value) => {
                                
                        
                                v=value
                                
                                infoTime.style.display="none"
                                var start = performance.now()
                                
                                var q = `${chromosome},${pos}`
                                var result = await v.query(q)
                                makeHeader(v.cols)
                                handleHits(result, 0)
                                all_results = result
                                
                                var end = performance.now()
                                var diff=((end-start)/1000).toFixed(2)
                                runtime.innerHTML=  `${diff} seconds`
                                infoTime.style.display="block"
                                
                                filter.innerHTML="Filter"
                                filter.disabled=false
                                
                            })
                        }
                        else{
                            alert('Select a valid chromosome and position')
                        }
                        
                        
                        /*
                        filterb.disabled=false
                        exporting.disabled=false
                        */
                    }
                    
                    makePerformancePlot = (pdata) => {
                        plotPerfomance.innerHTML=''
                        
                        var keys = Object.keys(pdata)
                        
                        if(keys.length>2){
                            var x = []
                            var y1_time = []
                            var y2_qlength = []
                            keys.forEach( i => {
                                var name = i=='total' ? 'Total' : 'Chromosome '+i
                                x.push(name)
                                y1_time.push( Number(pdata[i]['time'].toFixed(2)) )
                                y2_qlength.push(pdata[i]['queryLength'])
                            })
                            
                            var trace1 = {
                              x: x,
                              y: y1_time,
                              text: y1_time, 
                              name: 'Execution Time',
                              type: 'bar'
                            };

                            var trace2 = {
                              x: x,
                              y: y2_qlength,
                              mode: 'lines+markers+text',
                              text: y2_qlength,
                              textposition: 'top',
                              name: 'Number of pairs',
                              yaxis: 'y2',
                              type: 'scatter'
                            };

                            var data = [trace1, trace2];

                            var layout = {
                              legend: { x: 1.05 },
                              title: 'Performance comparison by chromosome',
                              xaxis: {title: 'Chromosomes'},
                              yaxis: {title: 'Time (ms)'},
                              yaxis2: {
                                title: 'Count',
                                titlefont: {color: 'rgb(148, 103, 189)'},
                                tickfont: {color: 'rgb(148, 103, 189)'},
                                overlaying: 'y',
                                side: 'right'
                              }
                            };

                            Plotly.newPlot('plotPerfomance', data, layout);
                        }
                    }
                    
                    filterBatchFun = async () => {
                        var params = document.location.hash.indexOf('=')==-1 ? 'url=https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz&range=0,10000&query=7,151040280&scope=demo1' : document.location.hash ;
                        params = params.replace('#','').split('&')
                        var par = {}
                        params.forEach( x => {
                            if(x.split('=').length > 1){
                                par[ x.split('=')[0] ] = x.split('=')[1]
                            }
                        })
                        var scope=par['scope']
                        
                        /*
                        filter.disabled=true
                        exporting.disabled=true
                        */
                        
                        filterb.innerHTML="Filtering ..."
                        filterb.disabled=true
                            
                        filteredSnps.style.display='none'
                        
                        let url=vcfURL.value;   
                        
                        Vcf(url).then(  async(value) => {
                            v = value
                            
                            infoTimeb.style.display="none"
                            var start = performance.now()
                            
                            var dat = await fetch(location.href.split('#')[0]+scope+'_multiple_query.json')
                            dat = await dat.json()
                            var result = await v.queryInBatch( dat['list'] ) 
                            makeHeader(v.cols)
                            handleHits(result, 0)
                            all_results = result
                            makePerformancePlot(all_results['performanceTime'])
                            
                            var end = performance.now()
                            var diff=((end-start)/1000).toFixed(2)
                            runtimeb.innerHTML=  `${diff} seconds`
                            infoTimeb.style.display="block"
                            
                            filterb.innerHTML="Filter"
                            filterb.disabled=false
                        })
                        
                        
                        /*
                        filter.disabled=false
                        exportingb.disabled=false
                        */
                    }
                    
                    exportFun = () => {
                        if(v!=null){
                            v.saveQueryResult()
                        }
                        else{
                            alert('There are no query results')
                        }
                    }
                    
                    handleUrlParams = () => {
                        var params = document.location.hash.indexOf('=')==-1 ? 'url=https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz&range=0,10000&query=7,151040280&scope=demo1' : document.location.hash ;
                        var paramsl = params.replace('#','').split('&')
                        var par = {}
                        paramsl.forEach( x => {
                            if(x.split('=').length > 1){
                                par[ x.split('=')[0] ] = x.split('=')[1]
                            }
                        })
                       
                        var keys = Object.keys(par)
                        
                        plotRetrieval.innerHTML=''
                        plotPerfomance.innerHTML=''
                        
                        var scope=''
                        document.getElementById('listFunction').style.display='none'
                        var dlist=[1,2,3]
                        dlist.forEach( i => {
                            scope='demo'+i
                            document.getElementById(scope+'_info').style.display='none'
                            
                            document.getElementById(scope+'_example').style.display='none'
                            document.getElementById(scope+'_file').style.display='none'
                            
                        })
                        
                        if(keys.includes('scope')){
                            scope=par['scope']
                            selectDemo.value=params.replace('#','')
                            
                            if( document.getElementById(scope+'_info')!=null ){
                                document.getElementById(scope+'_info').style.display='block'
                            
                                document.getElementById(scope+'_example').style.display='block'
                                document.getElementById(scope+'_file').style.display='block'
                                document.getElementById('listFunction').style.display='block'
                            }
                        }
                        
                        var flagValidation = true
                        if( keys.includes('url')  ){
                            var flag = false
                            if( par['url'].toLowerCase().indexOf('http')==0 && par['url'].toLowerCase().indexOf('vcf')!=-1 ){
                                flag = true
                                vcfURL.value=par['url']
                            }
                            flagValidation = flagValidation && flag
                        }
                        else {
                            flagValidation = false
                        }
                        
                        if( keys.includes('range') ){
                            var r=par['range'].split(',')
                            var flag=! isNaN(parseInt(r[0]))
                            if(r.length>1){
                                flag = flag && ! isNaN(parseInt(r[1]))
                            }
                            else{
                                flag ? r.push(parseInt(r[0]))+10000 : false
                            }
                            if(flag){
                                rangeStart.value=r[0]
                                rangeEnd.value=r[1]
                            }
                        }
                        else{
                            rangeStart.value=0
                            rangeEnd.value=10000
                        }
                        
                        var flagQuery = true
                        if( keys.includes('query') ){
                            var r=par['query'].split(',')
                            var flag=true
                            if(r.length>1){
                                flag = flag && ! isNaN(parseInt(r[1]))
                            }
                            else{
                                flag=false
                                console.log('Error: When using the query parameter, it is mandatory the chromosome and position (chromosome,position)')
                            }
                            if(flag){
                                chrom.value=r[0]
                                position.value=r[1]
                            }
                            flagQuery = flagQuery && flag
                        }
                        
                        infoTime.style.display="none"
                        infoTimeb.style.display="none"
                        
                        if(flagValidation){
                            var el = document.querySelector('#home-tab')
                            var tab = new bootstrap.Tab(el);
                            tab.show()
                            
                            //makeRetrievalPlot()
                            
                            readRangeFun()
                            
                            if(flagQuery){
                                filterFun()
                            }
                        }
                        else{
                            alert('Parameters are not valid')
                        }
                    }
