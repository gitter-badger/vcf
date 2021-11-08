console.log('vcf.js loaded')

//vcf = function (url='test_4X_191.vcf'){
vcf = function (url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/All_20180418.vcf.gz',keyGap){
//vcf = function (url='https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz'){
    //vcf = function (url='clinvar_20201226.vcf.gz'){
    // 'https://raw.githubusercontent.com/compbiocore/VariantVisualization.jl/master/test/test_files/test_4X_191.vcf
    //this.url=url||
    this.url=url
    this.date=new Date()
    let that=this;
    this.size=vcf.fileSize(url);  // await v.size will garantee one or the other
    this.indexGz=async(url=this.url)=>{
        that.indexGz=await vcf.indexGz(url,size=await that.size) // note how the indexGz function is replaced by the literal result
        return that.indexGz
    }
    this.getArrayBuffer=async(range=[0,1000],url=this.url)=>{
    	return vcf.getArrayBuffer(range,url)
    }
    this.keyGap=keyGap||vcf.keyGap

    this.fetchGz = async(range=[0,1000],url=this.url)=>{
    	let res = await vcf.fetchGz(range,url)
    	// record index, unlike vcf.fetchGz
    	vcf.idxx(this,res)
    	//debugger
    	return res
    }

    this.fetch=async(range=[0,1000])=>{
    	/*
        let sufix = url.match(/.{3}$/)[0]
        switch(url.match(/.{3}$/)[0]) {
          case '.gz':
            return await vcf.fetchGz(range,url=this.url)
            break;
          case 'tbi':
            return (await vcf.getTbi(url=this.url)).slice(range[0],range[1])
            break;
          default:
            return await (await vcf.fetch(range,this.url)).text()
        }
        */

        // check or retrieve header
        if(!this.meta){
        	vcf.meta(this)
        }


        let res = await vcf.fetchGz(range,url=this.url)
        return res
    }

    (async function(){ // fullfill these promises asap
    	that.size=await that.size
    	that.key=await (await vcf.fetch([0,15],that.url)).arrayBuffer()
    	const dv = new DataView(that.key)
        that.key = [...Array(dv.byteLength)].map((x,i)=>dv.getUint8(i)) // pick key from first 16 integers
        await vcf.meta(that) // extract metadata
        await vcf.tail(that)
    })(); 
    
    //this.indexGz2=vcf.indexGz(url,that.size) // note how the indexGz function is replaced by the literal result
}

vcf.fetch=(range,url)=>{
    return fetch(url,{
        headers: {
            'content-type': 'multipart/byteranges',
            'range': `bytes=${range.join('-')}`,
        }
    })
}

vcf.gzKey=[31, 139, 8, 4, 0, 0, 0, 0, 0, 255, 6, 0, 66, 67, 2, 0]
// just an example of a key, better retrieve it from the first 16 integers of the array buffer
vcf.keyGap=20000-1
vcf.concat=(a,b)=>{ // concatenate array buffers
    let c = new Uint8Array(a.byteLength+b.byteLength)
    c.set(new Uint8Array(a),0);
    c.set(new Uint8Array(b), a.byteLength);
    return c
}

vcf.meta= async that=>{ // extract metadata
	let ini = await vcf.fetchGz([0,100000])
	let arr = ini.txt.split(/\n/g)
    that.meta=arr.filter(r=>r.match(/^##/))
    that.cols=arr[that.meta.length].slice(1).split(/\t/) // column names
    console.log(`Columns: ${that.cols}`)
    let vals = arr[that.meta.length+1].split(/\t/g)
    //that.idxx = that.idxx || [{ki:0,chr:parseInt(vals[0]),pos:parseInt(vals[1])}]
    vcf.idxx(that,ini)
    return that.meta
}

vcf.tail=async that=>{ // to be run after vcf.meta, to find tail indexes to extablish span
	if(!that.meta||!that.idxx){
		await vcf.meta(that)
	}
	let ini = await vcf.fetchGz(that.size-that.keyGap)
	vcf.idxx(that,ini)
	//debugger
}

vcf.idxx=(that,ini)=>{ // index decompressed content
    //console.log('indexed ini:',ini)
    // extract data rows
    let dt = ini.txt.split(/\n/g).filter(x=>!x.match(/^#/)).map(r=>r.split(/\t/g))
    //console.log('dt:',dt)
    // find first full row
    let firstRow = dt[0]
    if(firstRow.length!=dt[1].length){ // if first and second rows have different numbers of columns
        firstRow=dt[1]
    }
    // find last full row
    let lastRow=dt.slice(-2,-1)[0]
    that.idxx = that.idxx || []
    that.ii00 = that.ii00 || []
    //if(that.idxx.length>0){
	//let ii00 = that.idxx.map(x=>x.ii[0]) // maybe we should keep this
	if(!that.ii00.includes(ini.idx[0])){ // if this is new
	    that.ii00.push(ini.idx[0]) // update index of start indexes
		that.idxx.push({
			ii:ini.idx,
			chrStart:vcf.parseInt(firstRow[0]),
			chrEnd:vcf.parseInt(lastRow[0]),
			posStart:parseInt(firstRow[1]),
			posEnd:parseInt(lastRow[1]),
			dt:dt
		}),
		that.idxx=vcf.sortIdxx(that.idxx)
		that.ii00=that.ii00.sort()
	}
    //}
			
    //debugger
}

vcf.parseInt=x=>{
	if(x.match(/^\d+$/)){
		return parseInt(x)
	}else{
		return x
	}
}

/*
vcf.idxx=(that,ini)=>{ // index decompressed content
    console.log('indexed ini:',ini)
    that.idxx = that.idxx || [{ki:0,chr:0,pos:0}] //{ki:[],chr:[],pos:[]} // indexing (ki) chromossome (chr) and position (pos) in the first full row after decompression key
    let n=ini.arrBuff.byteLength // length of array buffer slice
    let maxLine=2000 // maximum length of VCF row
    ini.idx.forEach((i,k)=>{
    //let i = ini.idx[0] // do only the first key match per set
    	let j=1 // first full position
    	let arr=[] // array of stringified rows after kth key match
    	if(k==0){
    		arr = ini.txt.split(/\n/g)
    	} else if((n-i)>maxLine){
    		let text_i=pako.inflate(ini.arrBuff.slice(i,i+maxLine),{"to":"string"})
    		arr = text_i.split(/\n/g)
    	}
    	let dt=arr.filter(r=>!r.match(/^#/)).map(a=>a.split(/\t/)) // it will be [] in none matches
    	if(dt.length>0){
    		if(dt[0].length==dt[1].length){j=0} // the first row is complete
			if(!that.idxx.map(x=>x.ki).includes(i)){ // skip repeats
				that.idxx.push({ki:i,chr:parseInt(dt[j][0]),pos:parseInt(dt[j][1])})
			}
    	}else{
    		console.log(`empty array at i=${i} with ini=`,ini)
    	}	
    	that.idxx=vcf.sortIdxx(that.idxx)
    }) // add new indes of keys
    // data only
    //let arr = ini.txt.split(/\n/g)
    //let dt=arr.filter(r=>!r.match(/^#/)).map(a=>a.split(/\t/)) // it will be [] in none matches
	//debugger
}
*/

vcf.sortIdxx=(idxx)=>{
	return idxx.sort((a,b)=>(a.ii[0]-b.ii[0]))
}

//vcf.getArrayBuffer=async(range=[0,1000],url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
vcf.getArrayBuffer=async(range=[0,1000],url='test_4X_191.vcf')=>{
    return await (await (fetch(url,{
        headers: {
			'content-type': 'multipart/byteranges',
			'range': `bytes=${range.join('-')}`,
		}
    }))).arrayBuffer()
}


vcf.fetchGz=async(range=0,url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz',keyGap=vcf.keyGap)=>{
    //let ab = await vcf.getArrayBuffer(range,url)
    // modulate range
    if(typeof(range)=="number"){
    	range = [range,range+keyGap]
    }
    if((range[1]-range[0])<keyGap){
    	range = [range[0],range[0]+keyGap]
    }
    // start at the previous inflatable key
    //let rr = range // floored range
    //rr[0]=Math.max(0,rr[0]-keyGap/2) // keyGap has to be an even integer
    //const ab = await (await vcf.fetch(rr,url)).arrayBuffer()
    
    // start at next inflatable key
    const ab = await (await vcf.fetch(range,url)).arrayBuffer()
    const dv = new DataView(ab)
    const it = [...Array(dv.byteLength)].map((x,i)=>dv.getUint8(i)) // as integers
    const id = vcf.matchKey(it.slice(0,keyGap))
    //console.log(`id = [${id}]\nit.length = ${it.length}`)
    let res = {
    	txt:pako.inflate(ab.slice(id[0]),{"to":"string"}),
    	arrBuff:ab,
    	idx:id.map(v=>v+range[0]),
    	range:range,
    	url:url
    }
    /*
    id.push(it.length)
    id.slice(0,-1).forEach((idi,i)=>{
    	res.txt[i]=pako.inflate(ab.slice(id[0]),{"to":"string"})
    })
    */

    return res
}

vcf.getTbi=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All_papu.vcf.gz.tbi')=>{
    const bf = pako.inflate((await (await fetch(url)).arrayBuffer()),{to:'arraybuffer'})
    const dv = new DataView(bf.buffer)
    return dv
    //return [...bf].map(x=>String.fromCharCode(parseInt(x))).join('')
}

vcf.indexGz=async(url='https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar_20201026.vcf.gz',size)=>{
    // index chunk locations and Chr:pos
    let idx={
        chunks:[],
        chrPos:[]
    }
    // find size of file
    idx.size = await size || await vcf.fileSize(url)
    idx.step=10000000
    for(let i=0;i<idx.size;i+=idx.step){
        let iNext = i+idx.step
        if(iNext>=idx.size){iNext=idx.size-1}
        let arr = await vcf.getArrayBuffer([i,iNext],url)
        arr = new DataView(arr)
        arr = [...Array(arr.byteLength)].map((x,i)=>arr.getUint8(i))
        let mtx=vcf.matchKey(arr,key=vcf.gzKey)
        mtx=mtx.map(x=>i+x)
        mtx.forEach(x=>{
            idx.chunks.push(x)
            let n = 1000
            if(i+x==0){n=100000}
            let txt=pako.inflate(arr.slice(x-i,x+n-i),{to:'string'})
            txts = txt.split(/\n(\w+\t+\w+)/)
            let chrPos = [null,null]
            if(txts.length>1){
                chrPos=txts[1].split(/\t/).map(x=>parseInt(x))
            }
            idx.chrPos.push(chrPos)
        })
        console.log(`${Date().slice(4,24)} ${Math.round(100*i/idx.size)}% : [ ${mtx.slice(0,3).join(' , ')} ... (${mtx.length})]`)
        //debugger
    }

    return idx
}

vcf.matchKey=(arr,key=vcf.gzKey)=>{
    let ind=arr.map((x,i)=>i) // the indexes
    key.forEach((k,j)=>{
        ind=ind.filter(i=>arr[i+j]==k)
    })
    return ind
}

vcf.compressIdx=function(idx,filename){
    // string it
    //let xx = pako.deflate(idx.chunks.concat(idx.chrPos.map(x=>x[0]).concat(idx.chrPos.map(x=>x[1]))))
    let xx = pako.gzip(idx.chunks.concat(idx.chrPos.map(x=>x[0]).concat(idx.chrPos.map(x=>x[1]))))
    if(filename){
        vcf.saveFile(xx,filename)
    }
    return xx
}

vcf.readIdx=async function(filename='idx.gz'){ // read compressed idx index
    //let xx = (await fetch(filename)).
}

vcf.fileSize=async(url='https://ftp.ncbi.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz')=>{
    let response = await fetch(url,{
        method:'HEAD'
    });
    const reader = response.body.getReader();
    const contentLength = response.headers.get('Content-Length');
    return parseInt(contentLength)
}

vcf.saveFile=function(x,fileName) { // x is the content of the file
	// var bb = new Blob([x], {type: 'application/octet-binary'});
	// see also https://github.com/eligrey/FileSaver.js
	var bb = new Blob([x]);
   	var url = URL.createObjectURL(bb);
	var a = document.createElement('a');
   	a.href=url;
   	a.download=fileName
	a.click()
	return a
}

vcf.loadScript= async function(url){
	console.log(`${url} loaded`)
    async function asyncScript(url){
        let load = new Promise((resolve,regect)=>{
            let s = document.createElement('script')
            s.src=url
            s.onload=resolve
            document.head.appendChild(s)
        })
        await load
    }
    // satisfy dependencies
    await asyncScript(url)
} 

// Study this:
// https://github.com/GMOD/tabix-js


if(typeof(define)!='undefined'){
    define({proto:vcf})
}

if(typeof(pako)=="undefined"){
	vcf.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.11/pako.min.js')
}