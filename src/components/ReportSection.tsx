import styles from './ReportSection.module.css';

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

const TOC_ITEMS = [
  { num: '1', label: '개요 및 배경', href: '#section-1' },
  { num: '2', label: '아키텍처 비교', href: '#section-2' },
  { num: '3', label: '시뮬레이션 분석', href: '#section-3' },
  { num: '4', label: '지표 비교', href: '#section-4' },
  { num: '5', label: '핵심 인사이트', href: '#section-5' },
  { num: '6', label: '코드 비교', href: '#section-6' },
];

export function ReportSection() {
  return (
    <article className={styles.report}>
      {/* ── Title Block ── */}
      <div className={styles.titleBlock}>
        <h1 className={styles.reportTitle}>
          CPython GIL 경합: Aerospike Async Client 성능 문제 개선
        </h1>
        <p className={styles.reportSubtitle}>
          <code className="mono">run_in_executor</code> 기반 공식 클라이언트와
          Tokio 네이티브 런타임 기반 <code className="mono">aerospike-py</code>의
          동시성 모델 비교
        </p>
        <div className={styles.meta}>
          <Meta label="Date" value="2026-03-05" />
          <Meta label="Version" value="v1.0" />
          <Meta label="Status" value="Draft" />
        </div>
      </div>

      {/* ── Table of Contents ── */}
      <Section title="목차">
        <div className={styles.toc}>
          {TOC_ITEMS.map((item) => (
            <a key={item.num} href={item.href} className={styles.tocItem}>
              <span className={styles.tocNum}>{item.num}</span>
              <span className={styles.tocLabel}>{item.label}</span>
            </a>
          ))}
        </div>
      </Section>

      {/* ── Executive Summary ── */}
      <Section title="Executive Summary">
        <p>
          공식 Aerospike Python Client의{' '}
          <span className={styles.bad}>run_in_executor</span> 패턴은
          GIL 경합으로 인해 동시 요청 증가 시 이벤트 루프가 정지하는 구조적
          한계가 있다.{' '}
          <span className={styles.good}>aerospike-py</span>는 Tokio 네이티브
          런타임으로 GIL-free I/O를 구현하여 이벤트 루프 무중단과 높은 TPS를
          안정적으로 유지한다.
          이 차이는 튜닝이 아닌{' '}
          <span className={styles.accent}>아키텍처 수준의 근본적 차이</span>이며,
          아래 인터랙티브 시뮬레이션을 통해 시각적으로 확인할 수 있다.
        </p>
      </Section>

      {/* ── Key Findings ── */}
      <Section title="주요 발견">
        <ul className={styles.findings}>
          <li className={styles.finding}>
            <span className={styles.findingIcon}>🔴</span>
            <span>
              <b>GIL 병목:</b> <code className="mono">run_in_executor</code>는 N개
              스레드가 동시에 I/O를 완료하면{' '}
              <span className={styles.bad}>~40μs x N의 GIL 경합</span>이 발생하여
              이벤트 루프가 완전히 정지합니다.
            </span>
          </li>
          <li className={styles.finding}>
            <span className={styles.findingIcon}>🟢</span>
            <span>
              <b>GIL-free I/O:</b> Tokio 런타임은 전체 네트워크 처리를 Rust 영역에서
              수행하며, 결과 전달 시에만{' '}
              <span className={styles.good}>~12μs의 최소 GIL 접근</span>이
              발생합니다.
            </span>
          </li>
          <li className={styles.finding}>
            <span className={styles.findingIcon}>📊</span>
            <span>
              <b>Pool 크기 무관:</b> ThreadPool 크기를 8에서 50으로 증가시켜도
              이벤트 루프 stall은{' '}
              <span className={styles.bad}>해소되지 않으며 오히려 악화</span>됩니다.
            </span>
          </li>
          <li className={styles.finding}>
            <span className={styles.findingIcon}>⚡</span>
            <span>
              <b>구조적 차이:</b> 이 차이는 튜닝으로 해결할 수 없는{' '}
              <span className={styles.accent}>아키텍처 수준의 근본적 차이</span>
              입니다.
            </span>
          </li>
        </ul>
      </Section>

      {/* ── Background ── */}
      <Section id="section-1" title="배경">
        <h4 className={styles.subHeading}>asyncio와 이벤트 루프</h4>
        <p>
          Python의 asyncio는 단일 스레드 이벤트 루프 기반의 cooperative
          multitasking 모델입니다. 코루틴이{' '}
          <code className="mono">await</code> 지점에서 제어권을 양보하며
          동시성을 달성하는 구조로, 이벤트 루프 스레드가 block되면 해당 프로세스의
          모든 요청 처리가 중단됩니다. FastAPI, aiohttp 등 비동기 프레임워크는
          이 이벤트 루프 위에서 동작하므로, 루프 정지는 곧 서버 전체의 응답 불가를
          의미합니다.
        </p>

        <h4 className={styles.subHeading}>run_in_executor 패턴</h4>
        <p>
          네이티브 비동기를 지원하지 않는 라이브러리는{' '}
          <code className="mono">loop.run_in_executor(pool, sync_fn, *args)</code>
          를 통해 blocking 호출을 OS 스레드풀에 위임합니다. 공식 Aerospike Python
          Client가 이 패턴을 채택하고 있으며(
          <a
            href="https://github.com/aerospike/aerospike-client-python/issues/263#issuecomment-2463025139"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.accent}
          >
            이슈 #263
          </a>
          ), Sync Client로 인한 프로세스 전체 block 문제를 해결하여
          TPS를 효과적으로 개선합니다. 그러나 이 접근법은 본질적으로 멀티스레딩이며,
          CPython의 GIL이라는 새로운 병목을 수반합니다.
        </p>

        <h4 className={styles.subHeading}>CPython GIL과 멀티스레딩</h4>
        <p>
          GIL(Global Interpreter Lock)은 CPython에서 Python 객체 접근을
          직렬화하는 전역 락입니다. I/O 작업 중에는 GIL이 해제되어 다른 스레드가
          실행될 수 있지만, I/O 완료 후 결과를 Python{' '}
          <code className="mono">dict</code>로 변환하려면 GIL을 재획득해야 합니다.
          N개 스레드가 동시에 I/O를 완료하면{' '}
          <span className={styles.bad}>~40μs x N</span>의 직렬 대기가 발생하며,
          이 동안 이벤트 루프 스레드 역시 GIL을 얻지 못해 완전히 정지합니다.
          아래 인터랙티브 시뮬레이션을 통해 이 구조적 차이를 시각적으로 확인할 수
          있습니다.
        </p>
      </Section>
    </article>
  );
}
